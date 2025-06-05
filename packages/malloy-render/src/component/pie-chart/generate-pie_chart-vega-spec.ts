/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {getPieChartSettings} from './get-pie_chart-settings';
import type {
  ChartTooltipEntry,
  MalloyDataToChartDataHandler,
  MalloyVegaDataRecord,
  VegaChartProps,
} from '../types';
import type {ChartLayoutSettings} from '../chart-layout-settings';
import {getChartLayoutSettings} from '../chart-layout-settings';
import type {
  Data,
  Item,
  Mark,
  Signal,
  Spec,
  View,
  Scale,
  Legend,
} from 'vega';
import {renderNumericField} from '../render-numeric-field';
import {getCustomTooltipEntries} from './get-custom-tooltips-entries';
import type {CellValue, RecordCell, RepeatedRecordField, RepeatedRecordCell} from '../../data_tree';
import {Field} from '../../data_tree';
import {NULL_SYMBOL, renderTimeString} from '../../util';
import type {Tag} from '@malloydata/malloy-tag';
import type {RenderMetadata} from '../render-result-metadata';

type PieDataRecord = {
  category: string;
  value: number;
  percentage: number;
} & MalloyVegaDataRecord;

function getLimitedData({
  categoryField,
  maxCategories = 10,
  chartTag,
}: {
  categoryField: Field;
  maxCategories?: number;
  chartTag: Tag;
}) {
  // Limit categories shown
  const categoryLimit =
    chartTag.numeric('category', 'limit') ??
    Math.min(maxCategories, categoryField.valueSet.size);
  const categoriesToPlot = [...categoryField.valueSet.values()].slice(0, categoryLimit);

  return {
    categoriesToPlot,
    categoryLimit,
  };
}

export function generatePieChartVegaSpec(
  explore: RepeatedRecordField,
  metadata: RenderMetadata
): VegaChartProps {
  const tag = explore.tag;
  const chartTag = tag.tag('pie_chart') ?? tag.tag('pie');
  if (!chartTag)
    throw new Error(
      'Pie chart should only be rendered for pie_chart or pie tag'
    );
  const settings = getPieChartSettings(explore);

  /**************************************
   *
   * Chart data fields
   *
   *************************************/

  const categoryFieldPath = settings.categoryChannel.fields.at(0);
  const valueFieldPath = settings.valueChannel.fields.at(0);

  if (!categoryFieldPath) throw new Error('Malloy Pie Chart: Missing category field');
  if (!valueFieldPath) throw new Error('Malloy Pie Chart: Missing value field');

  const categoryField = explore.fieldAt(categoryFieldPath);
  const valueField = explore.fieldAt(valueFieldPath);

  const categoryRef = categoryField.referenceId;
  const valueRef = valueField.referenceId;

  // Unique brush event source ids for this chart instance
  const brushCategorySourceId = 'brush-category_' + crypto.randomUUID();

  /**************************************
   *
   * Chart layout
   *
   *************************************/

  const chartSettings = getChartLayoutSettings(explore, chartTag, {
    metadata,
    chartType: 'pie_chart',
  });

  const {categoriesToPlot, categoryLimit} = getLimitedData({
    categoryField,
    chartTag,
  });

  /**************************************
   *
   * Data transformation
   *
   *************************************/

  const mapMalloyDataToChartData: MalloyDataToChartDataHandler = (
    data: RepeatedRecordCell
  ) => {
    const records: PieDataRecord[] = [];
    let totalValue = 0;

    // First pass: calculate total for percentages
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const categoryValue = row.cellAt(categoryFieldPath).value;
      const valueValue = row.cellAt(valueFieldPath).value;

      if (categoryValue === null || valueValue === null) continue;
      if (typeof valueValue !== 'number') continue;

      totalValue += valueValue;
    }

    // Second pass: create records with percentages
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const categoryValue = row.cellAt(categoryFieldPath).value;
      const valueValue = row.cellAt(valueFieldPath).value;

      if (categoryValue === null || valueValue === null) continue;
      if (typeof valueValue !== 'number') continue;

      const categoryStr = String(categoryValue);
      if (!categoriesToPlot.includes(categoryValue)) continue;

      const percentage = totalValue > 0 ? Math.round((valueValue / totalValue) * 100 * 10) / 10 : 0;

      records.push({
        category: categoryStr,
        value: valueValue,
        percentage,
        __row: row,
      });
    }

    const isDataLimited = categoryField.valueSet.size > categoryLimit;
    const dataLimitMessage = isDataLimited
      ? `Showing ${categoryLimit} of ${categoryField.valueSet.size} categories`
      : undefined;

    return {
      data: records,
      isDataLimited,
      dataLimitMessage,
    };
  };

  /**************************************
   *
   * Vega specification
   *
   *************************************/

  const data: Data[] = [
    {
      name: 'values',
      values: [],
      transform: [
        {
          type: 'pie',
          field: 'value',
          startAngle: 0,
          endAngle: {signal: '2 * PI'},
        },
      ],
    },
  ];

  const signals: Signal[] = [
    {
      name: 'brushIn',
      value: [],
    },
    {
      name: 'brushOut',
      value: [],
    },
    {
      name: 'innerRadius',
      update: settings.isDonut 
        ? settings.innerRadiusSize === 'small' 
          ? 'min(width, height) / 8'
          : settings.innerRadiusSize === 'large'
          ? 'min(width, height) / 4'
          : 'min(width, height) / 6'  // medium
        : '0',
    },
  ];

  const marks: Mark[] = [
    {
      type: 'arc',
      from: {data: 'values'},
      encode: {
        enter: {
          fill: {scale: 'color', field: 'category'},
          x: {signal: 'width / 2'},
          y: {signal: 'height / 2'},
        },
        update: {
          startAngle: {field: 'startAngle'},
          endAngle: {field: 'endAngle'},
          innerRadius: {signal: 'innerRadius'},
          outerRadius: {signal: 'min(width, height) / 2 - 10'},
          stroke: {value: 'white'},
          strokeWidth: {value: 2},
          opacity: {value: 0.8},
        },
        hover: {
          opacity: {value: 1},
        },
      },
    },
  ];

  const scales: Scale[] = [
    {
      name: 'color',
      type: 'ordinal',
      domain: {data: 'values', field: 'category'},
      range: 'category',
    },
  ];

  const legends: Legend[] = [
    {
      fill: 'color',
      orient: 'right' as const,
      padding: 10,
      encode: {
        symbols: {
          update: {
            strokeWidth: {value: 0},
          },
        },
      },
    },
  ];

  const spec: Spec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width: chartSettings.plotWidth,
    height: chartSettings.plotHeight,
    padding: 5,
    data,
    signals,
    scales,
    legends,
    marks,
  };

  const getTooltipData = (item: Item, view: View): ChartTooltipEntry | null => {
    return getCustomTooltipEntries(item, view);
  };

  return {
    spec,
    plotWidth: chartSettings.plotWidth,
    plotHeight: chartSettings.plotHeight,
    totalWidth: chartSettings.totalWidth,
    totalHeight: chartSettings.totalHeight,
    chartType: 'pie_chart',
    chartTag,
    mapMalloyDataToChartData,
    getTooltipData,
  };
} 