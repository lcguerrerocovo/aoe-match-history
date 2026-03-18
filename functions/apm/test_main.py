"""Tests for APM Cloud Function."""
import base64
import io
import json
import zipfile
from datetime import timedelta
from enum import Enum
from unittest.mock import patch

import responses

from main import _categorize, apm_handler
from conftest import MockAction, MockPlayer, MockMatch


# ---------------------------------------------------------------------------
# _categorize() — pure function tests
# ---------------------------------------------------------------------------

class TestCategorize:

    def test_enum_with_name(self):
        """Enum .type with .name attribute returns the name."""
        class ActionType(Enum):
            MOVE = 1
        cmd = MockAction(action_type=ActionType.MOVE)
        assert _categorize(cmd) == "MOVE"

    def test_plain_string_via_type(self):
        """String .type is returned as-is."""
        cmd = MockAction(action_type="BUILD")
        assert _categorize(cmd) == "BUILD"

    def test_fallback_to_action(self):
        """.action used when .type is None."""
        cmd = MockAction(action="RESEARCH")
        assert _categorize(cmd) == "RESEARCH"

    def test_fallback_to_operation(self):
        """.operation used when .type and .action are None."""
        cmd = MockAction(operation="GARRISON")
        assert _categorize(cmd) == "GARRISON"

    def test_none_returns_other(self):
        """No attributes → OTHER."""
        cmd = MockAction()
        assert _categorize(cmd) == "OTHER"

    def test_unknown_object_str_fallback(self):
        """Non-enum, non-string object → str() fallback."""
        class WeirdType:
            def __str__(self):
                return "WEIRD"
        cmd = MockAction(action_type=WeirdType())
        assert _categorize(cmd) == "WEIRD"


# ---------------------------------------------------------------------------
# Request validation
# ---------------------------------------------------------------------------

class TestRequestValidation:

    def test_options_returns_cors_preflight(self, mock_request):
        body, status, headers = apm_handler(mock_request(method="OPTIONS"))
        assert status == 204
        assert headers["Access-Control-Allow-Origin"] == "*"

    def test_get_returns_405(self, mock_request):
        body, status, headers = apm_handler(mock_request(method="GET"))
        assert status == 405
        assert "Method not allowed" in json.loads(body)["error"]

    def test_missing_json_returns_400(self, mock_request):
        body, status, headers = apm_handler(mock_request(method="POST", json_data=None))
        assert status == 400
        assert "Invalid JSON" in json.loads(body)["error"]

    def test_missing_game_id_returns_400(self, mock_request):
        body, status, headers = apm_handler(mock_request(json_data={"profileId": "123"}))
        assert status == 400

    def test_missing_profile_id_returns_400(self, mock_request):
        body, status, headers = apm_handler(mock_request(json_data={"gameId": "456"}))
        assert status == 400

    def test_empty_game_id_returns_400(self, mock_request):
        body, status, headers = apm_handler(mock_request(json_data={"gameId": "", "profileId": "123"}))
        assert status == 400

    def test_empty_profile_id_returns_400(self, mock_request):
        body, status, headers = apm_handler(mock_request(json_data={"gameId": "456", "profileId": ""}))
        assert status == 400


# ---------------------------------------------------------------------------
# Replay processing — mock HTTP + mgz
# ---------------------------------------------------------------------------

class TestReplayProcessing:

    @responses.activate
    @patch("main.parse_match")
    @patch("main.serialize", return_value={})
    def test_successful_parse(self, mock_serialize, mock_parse, mock_request):
        """Happy path: replay fetched, parsed, actions bucketed."""
        responses.add(
            responses.GET,
            "https://aoe.ms/replay/",
            body=b"fake-replay-data",
            status=200,
        )
        mock_parse.return_value = MockMatch(
            actions=[
                MockAction(player=1, timestamp=timedelta(seconds=30), action_type="MOVE"),
                MockAction(player=1, timestamp=timedelta(seconds=90), action_type="BUILD"),
                MockAction(player=2, timestamp=timedelta(seconds=30), action_type="MOVE"),
            ],
            players=[MockPlayer(number=1, profile_id="111"), MockPlayer(number=2, profile_id="222")],
            duration=timedelta(minutes=5),
        )

        req = mock_request(json_data={"gameId": "G1", "profileId": "111"})
        body, status, headers = apm_handler(req)
        assert status == 200

        data = json.loads(body)
        assert data["matchId"] == "G1"
        assert "111" in data["apm"]["players"]
        assert "222" in data["apm"]["players"]
        assert "averages" in data["apm"]

    @responses.activate
    def test_replay_fetch_non_200(self, mock_request):
        """Replay endpoint returns non-200 → 404."""
        responses.add(responses.GET, "https://aoe.ms/replay/", status=403)
        req = mock_request(json_data={"gameId": "G1", "profileId": "111"})
        body, status, headers = apm_handler(req)
        assert status == 404
        assert "Replay fetch status" in json.loads(body)["error"]

    @patch("main.requests.get", side_effect=ConnectionError("timeout"))
    def test_replay_fetch_exception(self, mock_get, mock_request):
        """Network error fetching replay → 502."""
        req = mock_request(json_data={"gameId": "G1", "profileId": "111"})
        body, status, headers = apm_handler(req)
        assert status == 502
        assert "Failed to fetch replay" in json.loads(body)["error"]

    @responses.activate
    @patch("main.parse_match", side_effect=Exception("corrupt replay"))
    def test_parse_failure(self, mock_parse, mock_request):
        """mgz parse failure → 400."""
        responses.add(responses.GET, "https://aoe.ms/replay/", body=b"bad", status=200)
        req = mock_request(json_data={"gameId": "G1", "profileId": "111"})
        body, status, headers = apm_handler(req)
        assert status == 400
        assert "Failed to parse replay" in json.loads(body)["error"]

    @responses.activate
    @patch("main.parse_match")
    @patch("main.serialize", return_value={})
    def test_no_commands(self, mock_serialize, mock_parse, mock_request):
        """Parsed replay with empty actions → 400."""
        responses.add(responses.GET, "https://aoe.ms/replay/", body=b"data", status=200)
        mock_parse.return_value = MockMatch(actions=[], players=[])
        req = mock_request(json_data={"gameId": "G1", "profileId": "111"})
        body, status, headers = apm_handler(req)
        assert status == 400
        assert "No commands found" in json.loads(body)["error"]


# ---------------------------------------------------------------------------
# Action bucketing & APM calculation
# ---------------------------------------------------------------------------

class TestActionBucketing:

    @responses.activate
    @patch("main.parse_match")
    @patch("main.serialize", return_value={})
    def test_actions_bucketed_by_minute(self, mock_serialize, mock_parse, mock_request):
        """Actions land in the correct minute buckets."""
        responses.add(responses.GET, "https://aoe.ms/replay/", body=b"data", status=200)
        mock_parse.return_value = MockMatch(
            actions=[
                MockAction(player=1, timestamp=timedelta(seconds=10), action_type="MOVE"),
                MockAction(player=1, timestamp=timedelta(seconds=20), action_type="MOVE"),
                MockAction(player=1, timestamp=timedelta(seconds=70), action_type="BUILD"),
            ],
            players=[MockPlayer(number=1, profile_id="P1")],
            duration=timedelta(minutes=2),
        )
        req = mock_request(json_data={"gameId": "G1", "profileId": "P1"})
        body, status, _ = apm_handler(req)
        data = json.loads(body)
        buckets = data["apm"]["players"]["P1"]

        # minute 0: 2 MOVE, minute 1: 1 BUILD
        assert buckets[0]["minute"] == 0
        assert buckets[0]["MOVE"] == 2
        assert buckets[0]["total"] == 2
        assert buckets[1]["minute"] == 1
        assert buckets[1]["BUILD"] == 1
        assert buckets[1]["total"] == 1

    @responses.activate
    @patch("main.parse_match")
    @patch("main.serialize", return_value={})
    def test_total_equals_sum_of_categories(self, mock_serialize, mock_parse, mock_request):
        """total in each bucket equals sum of all category counts."""
        responses.add(responses.GET, "https://aoe.ms/replay/", body=b"data", status=200)
        mock_parse.return_value = MockMatch(
            actions=[
                MockAction(player=1, timestamp=timedelta(seconds=10), action_type="MOVE"),
                MockAction(player=1, timestamp=timedelta(seconds=15), action_type="BUILD"),
                MockAction(player=1, timestamp=timedelta(seconds=20), action_type="MOVE"),
            ],
            players=[MockPlayer(number=1, profile_id="P1")],
            duration=timedelta(minutes=1),
        )
        req = mock_request(json_data={"gameId": "G1", "profileId": "P1"})
        body, status, _ = apm_handler(req)
        data = json.loads(body)
        bucket = data["apm"]["players"]["P1"][0]
        category_sum = sum(v for k, v in bucket.items() if k not in ("minute", "total"))
        assert bucket["total"] == category_sum

    @responses.activate
    @patch("main.parse_match")
    @patch("main.serialize", return_value={})
    def test_average_apm_calculated(self, mock_serialize, mock_parse, mock_request):
        """Average APM = total_actions / game_minutes, rounded."""
        responses.add(responses.GET, "https://aoe.ms/replay/", body=b"data", status=200)
        # 10 actions over 5 minutes → 2 APM
        actions = [
            MockAction(player=1, timestamp=timedelta(seconds=i * 30), action_type="MOVE")
            for i in range(10)
        ]
        mock_parse.return_value = MockMatch(
            actions=actions,
            players=[MockPlayer(number=1, profile_id="P1")],
            duration=timedelta(minutes=5),
        )
        req = mock_request(json_data={"gameId": "G1", "profileId": "P1"})
        body, status, _ = apm_handler(req)
        data = json.loads(body)
        assert data["apm"]["averages"]["P1"] == 2

    @responses.activate
    @patch("main.parse_match")
    @patch("main.serialize", return_value={})
    def test_duration_as_int_milliseconds(self, mock_serialize, mock_parse, mock_request):
        """Duration as int (milliseconds) handled correctly."""
        responses.add(responses.GET, "https://aoe.ms/replay/", body=b"data", status=200)
        actions = [
            MockAction(player=1, timestamp=timedelta(seconds=i * 10), action_type="MOVE")
            for i in range(6)
        ]
        mock_parse.return_value = MockMatch(
            actions=actions,
            players=[MockPlayer(number=1, profile_id="P1")],
            duration=180000,  # 3 minutes in ms
        )
        req = mock_request(json_data={"gameId": "G1", "profileId": "P1"})
        body, status, _ = apm_handler(req)
        data = json.loads(body)
        # 6 actions / 3 minutes = 2 APM
        assert data["apm"]["averages"]["P1"] == 2


# ---------------------------------------------------------------------------
# ZIP handling
# ---------------------------------------------------------------------------

class TestZipHandling:

    @responses.activate
    @patch("main.parse_match")
    @patch("main.serialize", return_value={})
    def test_zip_wrapped_replay(self, mock_serialize, mock_parse, mock_request):
        """ZIP-wrapped replay is extracted before parsing."""
        # Create a ZIP in memory with a fake replay file
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w") as zf:
            zf.writestr("replay.aoe2record", b"inner-replay-data")
        zip_bytes = zip_buf.getvalue()

        responses.add(responses.GET, "https://aoe.ms/replay/", body=zip_bytes, status=200)
        mock_parse.return_value = MockMatch(
            actions=[MockAction(player=1, timestamp=timedelta(seconds=10), action_type="MOVE")],
            players=[MockPlayer(number=1, profile_id="P1")],
            duration=timedelta(minutes=1),
        )

        req = mock_request(json_data={"gameId": "G1", "profileId": "P1"})
        body, status, _ = apm_handler(req)
        assert status == 200

        # Verify parse_match received the inner content, not the zip wrapper
        call_buf = mock_parse.call_args[0][0]
        assert call_buf.read() == b"inner-replay-data"

    @responses.activate
    @patch("main.parse_match")
    @patch("main.serialize", return_value={})
    def test_non_zip_replay_passed_through(self, mock_serialize, mock_parse, mock_request):
        """Non-ZIP replay bytes passed directly to parse_match."""
        raw = b"raw-replay-bytes"
        responses.add(responses.GET, "https://aoe.ms/replay/", body=raw, status=200)
        mock_parse.return_value = MockMatch(
            actions=[MockAction(player=1, timestamp=timedelta(seconds=10), action_type="MOVE")],
            players=[MockPlayer(number=1, profile_id="P1")],
            duration=timedelta(minutes=1),
        )

        req = mock_request(json_data={"gameId": "G1", "profileId": "P1"})
        body, status, _ = apm_handler(req)
        assert status == 200

        call_buf = mock_parse.call_args[0][0]
        assert call_buf.read() == raw


# ---------------------------------------------------------------------------
# Replay data field (base64 passthrough, skip HTTP download)
# ---------------------------------------------------------------------------

class TestReplayDataField:
    """Test that providing replayData skips the HTTP download."""

    def test_invalid_base64_returns_400(self, mock_request):
        req = mock_request(json_data={"gameId": "1", "profileId": "2", "replayData": "!!!not-base64!!!"})
        body, status, _ = apm_handler(req)
        assert status == 400
        assert "Invalid base64" in json.loads(body)["error"]

    @responses.activate
    @patch("main.parse_match")
    @patch("main.serialize", return_value={})
    def test_with_replay_data_skips_download(self, mock_serialize, mock_parse, mock_request, mock_match):
        """When replayData is provided, no HTTP request should be made."""
        fake_replay = base64.b64encode(b"fake-replay-bytes").decode()
        req = mock_request(json_data={"gameId": "1", "profileId": "2", "replayData": fake_replay})

        mock_parse.return_value = mock_match(
            actions=[MockAction(player=1, timestamp=timedelta(seconds=30), action_type="MOVE")],
            players=[MockPlayer(number=1, profile_id="2")],
            duration=timedelta(minutes=1)
        )
        body, status, _ = apm_handler(req)

        # Should succeed since parse_match is mocked with valid data
        assert status == 200
        # The key assertion: no HTTP calls were made
        assert len(responses.calls) == 0
