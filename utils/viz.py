import matplotlib.pyplot as plt
import seaborn as sns
import chartify
import pandas as pd
from bokeh.models import HoverTool, Label
from bokeh.core.properties import value
from bokeh.io import output_file, save
from bokeh.embed import components

import colorsys

def generate_colors(n):
    """Generate n distinct colors using HSL and convert to RGB."""
    return [colorsys.hls_to_rgb(i/n, 0.5, 0.8) for i in range(n)]

def plot_rec(df_rec): 
    # Pivot the aggregated DataFrame to have action types as columns
    pivoted = df_rec.pivot_table(index=['player', 'relative_minute'], columns='type', values='count', fill_value=0).reset_index()
    
    players = df_rec['player'].unique()
    
    # Set up the visual aesthetics for Seaborn
    sns.set(style="whitegrid")
    
    # Define a color palette
    unique_action_types = df_rec['type'].unique()
    palette = generate_colors(len(unique_action_types))
    color_mapping = dict(zip(unique_action_types, palette))
    stacking_order = sorted(unique_action_types)
    
    def get_stacking_order(df):
        return df[stacking_order].sum().sort_values(ascending=False).index.tolist()
    
    # Create a figure and axis objects
    fig, axes = plt.subplots(nrows=len(players), figsize=(20, 6*len(players)))  # Adjust the width for additional legend space
    
    for ax, player in zip(axes, players):
        player_data = pivoted[pivoted['player'] == player]
        
        # Compute the average actions per minute for this player
        total_actions = player_data[stacking_order].sum().sum()
        total_minutes = len(player_data)
        avg_actions_per_minute = total_actions / total_minutes
    
        # Determine the general order for stacking for this player
        player_order = get_stacking_order(player_data)
    
        # Iterate over the minutes and plot bars based on the order determined above
        bottom = None
        for action_type in player_order:
            ax.bar(player_data['relative_minute'], player_data[action_type], label=action_type, bottom=bottom, color=color_mapping[action_type])
            bottom = player_data[action_type] if bottom is None else bottom + player_data[action_type]
    
        ax.set_title(f"Actions for {player}")
        ax.set_ylabel("Count of Actions")
        ax.set_xlabel("Relative Minute")
        
        # Annotate the chart with the average actions per minute
        ax.text(0.02, 0.85, f'Avg actions/min: {avg_actions_per_minute:.2f}', transform=ax.transAxes, bbox=dict(facecolor='white', alpha=0.7))
    
    
    
        # Set the legend for the last axis outside of the plot on the right side
        ax.legend(loc='upper left', bbox_to_anchor=(1, 1))
    
        annot = ax.annotate("", xy=(0,0), xytext=(15,15), textcoords="offset points",
                            bbox=dict(boxstyle="round", fc="w"), arrowprops=dict(arrowstyle="->"))
        annot.set_visible(False)
        def update_annot(bar, action_type):
            x = bar.get_x() + bar.get_width() / 2
            y = bar.get_y() + bar.get_height() / 2
            annot.xy = (x, y)
            count = int(bar.get_height())
            minute = int(bar.get_x() + bar.get_width() / 2)
            annot.set_text(f"{action_type}\nMinute: {minute}\nCount: {count}")
            annot.get_bbox_patch().set_facecolor(color_mapping[action_type])
            annot.get_bbox_patch().set_alpha(0.7)
        def hover(event):
            vis = annot.get_visible()
            if event.inaxes == ax:
                for action_type, bars in bar_containers:
                    for bar in bars:
                        if bar.contains(event)[0]:
                            update_annot(bar, action_type)
                            annot.set_visible(True)
                            fig.canvas.draw_idle()
                            return
            if vis:
                annot.set_visible(False)
                fig.canvas.draw_idle()
        fig.canvas.mpl_connect("motion_notify_event", hover)
    plt.tight_layout()
    plt.show()

def stacked_bar_chart(df, title='', categories=['','']): 

    totals_filter = df['metric'] == "total"
    totals,df = (df[totals_filter], df[~totals_filter])

    ch = chartify.Chart(blank_labels=True, x_axis_type="categorical")
    ch.set_title(title)
    ch.plot.bar_stacked(
        data_frame=df,
        categorical_columns=categories,
        numeric_column="count",
        stack_column="metric",
    )

    ch.plot.text(
        data_frame=totals,
        categorical_columns=categories,
        numeric_column="count",
        text_column="count",
        x_offset=0,
        y_offset=0,
        font_size="7pt",
    )

    ch.axes.set_xaxis_tick_orientation('vertical')
    ch.axes.set_xaxis_label(f'{categories[1]} grouped by {categories[0]}')
    ch.axes.set_yaxis_label(f'count')
        
    metrics = df['metric'].drop_duplicates().tolist()
    hover = HoverTool(tooltips=[(f'{x}',f'@{x}') for x in metrics])
    ch.figure.add_tools(hover)
    ch.set_legend_location("outside_bottom")
    ch.show()

def un_pivot_df_metrics_with_totals(df, categories = ['','']):
    melted_df = pd.melt(
        df, 
        id_vars=categories, 
        var_name='metric', 
        value_name='count')
    totals = melted_df.groupby(categories).sum().reset_index().drop('metric',axis=1)
    totals['metric'] = "total"
    melted_df =  pd.concat([melted_df,totals], ignore_index=True)
    return melted_df

def parse_external_query(multiline_query):
    single_line_query = " ".join(line.strip() for line in multiline_query.split("\n") if line.strip())
    escaped_query = single_line_query.replace("'", "\\'")
    quoted_query = f"'{escaped_query}'"
    return quoted_query

def display_full(df):
    pd.set_option('display.max_rows', None)
    pd.set_option('display.max_columns', None)
    pd.set_option('display.max_colwidth', None)
    pd.set_option('display.width', None)
    styled_df = df.style.set_properties(**{'font-family': 'monospace'})

    display(styled_df)
    pd.reset_option('display.max_rows')
    pd.reset_option('display.max_columns')
    pd.reset_option('display.max_colwidth')
    pd.reset_option('display.width')


def plot_apm(df_rec, output_html=None, return_components=False, max_minute=None):
    """
    Generate APM charts for each player in df_rec.
    - If output_html is provided, save as standalone HTML (Bokeh output_file/save).
    - If return_components is True, return list of (player, script, div) for embedding.
    - If max_minute is provided, x-axis will be 0..max_minute for all players, filling missing minutes with zero actions.
    - Otherwise, show interactively (for notebook or direct script use).
    """
    melted = df_rec.pivot_table(
        index=['player', 'relative_minute', 'type'],
        values='count',
        aggfunc='sum'
    ).reset_index()
    melted['relative_minute'] = melted['relative_minute'].astype(float).astype(int)
    melted['player'] = melted['player'].astype(str)

    results = []
    for player in melted['player'].unique():
        player_df = melted[melted['player'] == player].copy()
        # Fill missing minutes with zero actions for all types
        if max_minute is not None:
            all_minutes = list(range(0, max_minute + 1))
            all_types = player_df['type'].unique()
            idx = pd.MultiIndex.from_product([[player], all_minutes, all_types], names=['player', 'relative_minute', 'type'])
            player_df = player_df.set_index(['player', 'relative_minute', 'type']).reindex(idx, fill_value=0).reset_index()
        player_df['relative_minute'] = player_df['relative_minute'].astype(str)
        total_actions = player_df['count'].sum()
        total_minutes = player_df['relative_minute'].astype(float).nunique()
        avg_apm = total_actions / total_minutes if total_minutes else 0
        type_counts = (
            player_df.groupby('type')['count']
            .sum()
            .sort_values(ascending=False)
        )
        total_actions = type_counts.sum()
        stack_order = type_counts.index.tolist()
        if max_minute is not None:
            minute_order = [str(m) for m in range(0, max_minute + 1)]
        else:
            minute_order = [m for m in sorted(player_df['relative_minute'].unique(), key=lambda x: int(x))]
        player_df = player_df.sort_values('relative_minute', key=lambda x: x.astype(int))
        ch = chartify.Chart(blank_labels=True, x_axis_type='categorical')
        ch.figure.width = 1200
        ch.set_title(f'Actions for {player}')
        ch.plot.bar_stacked(
            data_frame=player_df,
            categorical_columns=['relative_minute'],
            numeric_column='count',
            stack_column='type',
            categorical_order_by=minute_order,
            stack_order=stack_order
        )
        ch.axes.set_xaxis_label('Relative Minutes')
        ch.axes.set_yaxis_label('Count of Actions')
        ch.set_legend_location('outside_right')
        ch.axes.set_xaxis_tick_orientation('vertical')
        ch.figure.xaxis.major_label_text_font_size = "7pt"
        hover = HoverTool(tooltips=[
            ("type", "$name"),
            ("count", "@$name"),
        ])
        ch.figure.add_tools(hover)
        ch.figure.legend.orientation = "vertical"
        ch.figure.legend.label_text_font_size = "7pt"
        for idx, t in enumerate(stack_order):
            if idx < len(ch.figure.legend[0].items):
                percent = (type_counts[t] / total_actions * 100) if total_actions else 0
                ch.figure.legend[0].items[idx].label = value(f"{t} ({type_counts[t]}, {percent:.1f}%)")
        minute_totals = player_df.groupby('relative_minute')['count'].sum()
        y_pos = minute_totals.max()
        x_pos = len(player_df['relative_minute'].unique()) + 1
        label = Label(
            x=x_pos, y=y_pos,
            x_units='data', y_units='data',
            text=f"Avg APM: {avg_apm:.1f}",
            text_font_size='14pt',
            text_color='black'
        )
        ch.figure.add_layout(label)
        if return_components:
            # For embedding in a custom HTML page
            script, div = components(ch.figure)
            results.append((player, script, div))
        elif output_html:
            # For saving as standalone HTML
            output_file(output_html)
            save(ch.figure)
        else:
            # For interactive use (notebook or direct script)
            ch.show()
    if return_components:
        return results
    return None