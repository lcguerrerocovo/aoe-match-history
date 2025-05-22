import json
import pandas as pd
from mgz.model import parse_match, serialize
from mgz.summary import Summary
from datetime import datetime, timezone

ACTION_TYPE_DESCRIPTIONS = {
    "ERROR": "Error or unknown action.",
    "ORDER": "Generic order issued to a unit (e.g., patrol, guard, gather, attack-move).",
    "STOP": "Orders a unit to halt its current action.",
    "WORK": "Villager or unit performs a work action (e.g., gather, build, repair).",
    "MOVE": "Orders a unit to move to a location.",
    "CREATE": "Creates a new unit.",
    "ADD_ATTRIBUTE": "Adds an attribute to a unit or object.",
    "GIVE_ATTRIBUTE": "Transfers an attribute (e.g., resource) to a unit or object.",
    "AI_ORDER": "Order issued by the AI.",
    "RESIGN": "Player resigns from the game.",
    "SPECTATE": "Spectator action.",
    "ADD_WAYPOINT": "Adds a waypoint for a unit or group.",
    "STANCE": "Changes the stance of a unit (aggressive, defensive, stand ground, etc).",
    "GUARD": "Orders a unit to guard another unit or building.",
    "FOLLOW": "Orders a unit to follow another unit.",
    "PATROL": "Orders a unit to patrol between two points.",
    "FORMATION": "Changes the formation of selected military units.",
    "SAVE": "Save game action.",
    "GROUP_MULTI_WAYPOINTS": "Group movement with multiple waypoints.",
    "CHAPTER": "Campaign chapter action.",
    "DE_ATTACK_MOVE": "Definitive Edition: Attack move command, orders units to move and attack anything along the way.",
    "HD_UNKNOWN_34": "Unknown action type (HD Edition).",
    "DE_RETREAT": "Definitive Edition: Retreat command.",
    "DE_UNKNOWN_37": "Unknown action type (DE Edition).",
    "DE_AUTOSCOUT": "Definitive Edition: Auto-scout command, orders a scout to automatically explore the map.",
    "DE_UNKNOWN_39": "Unknown action type (DE Edition).",
    "DE_UNKNOWN_40": "Unknown action type (DE Edition).",
    "DE_TRANSFORM": "Definitive Edition: Transform command (e.g., auto-scout enable).",
    "RATHA_ABILITY": "Definitive Edition: Ratha unit ability.",
    "DE_107_A": "Unknown action type (DE Edition).",
    "DE_MULTI_GATHERPOINT": "Definitive Edition: Multiple gather points set.",
    "AI_COMMAND": "AI command action.",
    "DE_UNKNOWN_80": "Unknown action type (DE Edition).",
    "MAKE": "Orders a building to produce a unit.",
    "RESEARCH": "Initiates research of a technology.",
    "BUILD": "Orders a villager to construct a building.",
    "GAME": "Game command (e.g., diplomacy, speed, etc).",
    "WALL": "Orders a villager to build a wall segment.",
    "DELETE": "Deletes a unit or building.",
    "ATTACK_GROUND": "Orders a unit to attack a ground location.",
    "TRIBUTE": "Sends resources to another player.",
    "DE_UNKNOWN_109": "Unknown action type (DE Edition).",
    "REPAIR": "Orders a villager to repair a building or unit.",
    "UNGARRISON": "Orders units to leave a building.",
    "MULTIQUEUE": "Queues multiple units or technologies at once.",
    "GATE": "Orders a villager to build a gate.",
    "FLARE": "Sends a flare to allies.",
    "SPECIAL": "Special order (e.g., unique unit ability).",
    "QUEUE": "Queues a unit or technology for production.",
    "GATHER_POINT": "Sets the rally point for a building.",
    "SELL": "Sells resources at the market.",
    "BUY": "Buys resources at the market.",
    "DROP_RELIC": "Drops a relic from a monk.",
    "TOWN_BELL": "Rings the town bell (garrison villagers).",
    "BACK_TO_WORK": "Sends villagers back to work after town bell.",
    "DE_QUEUE": "Definitive Edition: Cancels a unit or technology from a production queue.",
    "DE_UNKNOWN_130": "Unknown action type (DE Edition).",
    "DE_UNKNOWN_131": "Unknown action type (DE Edition).",
    "DE_UNKNOWN_135": "Unknown action type (DE Edition).",
    "DE_UNKNOWN_136": "Unknown action type (DE Edition).",
    "DE_UNKNOWN_138": "Unknown action type (DE Edition).",
    "DE_107_B": "Unknown action type (DE Edition).",
    "DE_TRIBUTE": "Definitive Edition: Sends resources to another player (DE format).",
    "POSTGAME": "Postgame action (after the game ends).",
    # Add any additional or custom action types as needed
}

def format_duration(ms):
    seconds = int(ms // 1000)
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h:
        return f"{h}:{m:02}:{s:02}"
    else:
        return f"{m}:{s:02}"

def extract_match_summary(rec_path):
    with open(rec_path, 'rb') as f:
        s = Summary(f)
        diplomacy = s.get_diplomacy()  # {'type': 'TG', 'team_size': '4v4'}
        map_info = s.get_map()         # {'id': 12, 'name': 'Black Forest', 'size': 'Large', ...}
        teams = s.get_teams()          # e.g. [[1, 3, 5, 7], [2, 4, 6, 8]]
        players = s.get_players()      # list of dicts with 'name', 'number', 'civilization', etc.
        duration = s.get_duration()    # milliseconds
        start_ts = s.get_played()      # always the start time (timestamp)
        if start_ts:
            start_time = datetime.utcfromtimestamp(start_ts).strftime('%Y-%m-%d %H:%M UTC')
        else:
            start_time = '?'
        # winners from players list
        winners = [p['number'] for p in players if p.get('winner')]
        winning_team = None
        winning_team_players = []
        for idx, team in enumerate(teams):
            if any(num in winners for num in team):
                winning_team = idx + 1  # 1-based index
                winning_team_players = [p['name'] for p in players if p['number'] in team]
                break
        return {
            'diplomacy': diplomacy,
            'map': map_info,
            'teams': teams,
            'players': players,
            'duration': format_duration(duration),
            'winning_team': winning_team,
            'winning_team_players': winning_team_players,
            'start_time': start_time,
        }

def prepare_rec(filename, actions_to_remove = []):
    with open(filename, mode='rb') as in_file:
        match = parse_match(in_file)
        jsonFile = json.dumps(serialize(match.actions), indent=2)
    
    df = pd.read_json(jsonFile)
    
    df['player'] = df['player'].apply(lambda x: x.get('number') if isinstance(x, dict) else x)
        
    player_mapping = {i+1: str(name) for i, name in enumerate(match.players)}
    df['player'] = df['player'].replace(player_mapping)
             
    columns = ['timestamp', 'player', 'type']
        
    filtered_df = df[columns][~df['type'].isin(actions_to_remove + ['GAME','DE_TRANSFORM'])]
    
    filtered_df['datetime'] = pd.to_datetime(df['timestamp'])
    start_time = filtered_df['datetime'].min()
    filtered_df['relative_minute'] = (filtered_df['datetime'] - start_time).dt.total_seconds() // 60   
    aggregated = filtered_df.groupby(['player', 'relative_minute', 'type']).size().reset_index(name='count')
    return aggregated

def rec_to_df(filename):
    with open(filename, mode='rb') as in_file:
        match = parse_match(in_file)
        jsonFile = json.dumps(serialize(match.actions), indent=2)
    
    df = pd.read_json(jsonFile)
    
    df['player'] = df['player'].apply(lambda x: x.get('number') if isinstance(x, dict) else x)
        
    player_mapping = {i+1: str(name) for i, name in enumerate(match.players)}
    df['player'] = df['player'].replace(player_mapping)
    df['datetime'] = pd.to_datetime(df['timestamp'])
    start_time = df['datetime'].min()
    df['relative_minute'] = (df['datetime'] - start_time).dt.total_seconds() // 60
    df['relative_minute'] = df['relative_minute'].astype(int)
    df.drop(columns=['timestamp', 'datetime'], inplace=True)

    return df