# Pie Chart Implementation

This document describes the implementation of pie charts in the malloy-render package.

## Overview

The pie chart implementation follows the same pattern as other chart types (bar charts, line charts) in the malloy-render package. It consists of three main components:

1. **Settings** (`get-pie_chart-settings.ts`) - Handles chart configuration and field mapping
2. **Tooltip** (`get-custom-tooltips-entries.ts`) - Provides custom tooltip functionality
3. **Vega Specification** (`generate-pie_chart-vega-spec.ts`) - Generates the Vega visualization specification

## Files Added

### `src/component/pie-chart/get-pie_chart-settings.ts`
- Defines `PieChartSettings` interface with `categoryChannel` and `valueChannel`
- Parses pie chart tags from Malloy queries
- Automatically selects appropriate fields when not explicitly specified
- Supports both `pie_chart` and `pie` tag names

### `src/component/pie-chart/get-custom-tooltips-entries.ts`
- Provides tooltip functionality showing category, value, and percentage
- Returns formatted tooltip entries for display on hover

### `src/component/pie-chart/generate-pie_chart-vega-spec.ts`
- Main implementation file that generates Vega specification for pie charts
- Handles data transformation from Malloy results to pie chart format
- Calculates percentages automatically
- Supports data limiting for large datasets
- Implements proper color scaling and legends

### `src/component/render-result-metadata.ts` (Modified)
- Added `pie_chart` to `CHART_TAG_LIST`
- Added import for `generatePieChartVegaSpec`
- Added case handling for pie chart generation

## Usage

### Basic Pie Chart
```malloy
query: flights -> {
  group_by: carrier
  aggregate: flight_count
  limit: 10
} + {pie_chart}
```

### Pie Chart with Explicit Field Mapping
```malloy
query: flights -> {
  group_by: carrier
  aggregate: flight_count
  limit: 10
} + {pie_chart: {
  category: carrier
  value: flight_count
  title: "Flights by Carrier"
  subtitle: "Distribution of flights across different carriers"
}}
```

### Supported Tag Properties
- `category`: Field to use for pie slice categories
- `value`: Field to use for pie slice values
- `title`: Chart title
- `subtitle`: Chart subtitle
- `category.limit`: Maximum number of categories to display (default: 10)

## Features

1. **Automatic Field Selection**: If category/value fields aren't specified, the implementation automatically selects appropriate fields
2. **Percentage Calculation**: Automatically calculates and displays percentages in tooltips
3. **Data Limiting**: Supports limiting the number of categories displayed
4. **Interactive Tooltips**: Shows category name, value, and percentage on hover
5. **Color Scaling**: Uses Vega's built-in categorical color scheme
6. **Legend**: Displays a legend on the right side of the chart

## Technical Details

- Uses Vega's `pie` transform to calculate start and end angles
- Implements proper arc marks with hover effects
- Supports the same theming and configuration system as other charts
- Follows the same data mapping pattern as bar and line charts
- Integrates with the existing brush/selection system

## Testing

The implementation includes a comprehensive story file (`src/stories/pie_chart.stories.malloy`) with various examples:
- Basic pie charts with different data sources
- Charts with explicit field mappings
- Charts with titles and subtitles
- Different sizes and configurations

To test the implementation:
1. Run `npm run storybook`
2. Navigate to the pie chart stories
3. Verify that charts render correctly with proper tooltips and interactions 