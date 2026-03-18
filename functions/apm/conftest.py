"""Shared fixtures for APM function tests."""
import pytest


class MockRequest:
    """Minimal Flask-like request object for testing Cloud Functions."""

    def __init__(self, method="POST", json_data=None):
        self.method = method
        self._json = json_data

    def get_json(self, **kwargs):
        if self._json is None:
            raise ValueError("No JSON data")
        return self._json


class MockAction:
    """Mock mgz action/command object."""

    def __init__(self, player=1, timestamp=None, frame=None, action_type=None,
                 action=None, operation=None):
        self.player = player
        self.timestamp = timestamp
        self.frame = frame
        self.type = action_type
        self.action = action
        self.operation = operation


class MockPlayer:
    """Mock mgz player object."""

    def __init__(self, number, profile_id=None, name=None, civilization=None, winner=False):
        self.number = number
        self.profile_id = profile_id or str(number)
        self.name = name or f"Player{number}"
        self.civilization = civilization
        self.winner = winner


class MockMatch:
    """Mock mgz Match object returned by parse_match."""

    def __init__(self, actions=None, players=None, duration=None, guid=None,
                 dataset=None, map_info=None):
        self.actions = actions or []
        self.players = players or []
        self.duration = duration
        self.guid = guid
        self.dataset = dataset
        self.map = map_info


@pytest.fixture
def mock_request():
    """Factory fixture for creating mock requests."""
    def _make(method="POST", json_data=None):
        return MockRequest(method=method, json_data=json_data)
    return _make


@pytest.fixture
def mock_action():
    """Factory fixture for creating mock actions."""
    def _make(**kwargs):
        return MockAction(**kwargs)
    return _make


@pytest.fixture
def mock_player():
    """Factory fixture for creating mock players."""
    def _make(**kwargs):
        return MockPlayer(**kwargs)
    return _make


@pytest.fixture
def mock_match():
    """Factory fixture for creating mock matches."""
    def _make(**kwargs):
        return MockMatch(**kwargs)
    return _make
