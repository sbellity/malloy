/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {getKpiSettings} from './get-kpi-settings';
import type {RepeatedRecordField, RepeatedRecordCell} from '../../data_tree';
import {renderNumericField} from '../render-numeric-field';
import type {Tag} from '@malloydata/malloy-tag';
import type {RenderMetadata} from '../render-result-metadata';

export interface KpiData {
  title: string;
  value: string;
  change?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
    percentage: boolean;
  };
}

export interface KpiRenderProps {
  data: KpiData[];
  chartType: 'kpi';
  chartTag: Tag;
  mapMalloyDataToKpiData: (data: RepeatedRecordCell) => { data: KpiData[] };
}

function formatChangeValue(value: number, isPercentage: boolean = false): string {
  const formatted = isPercentage ? `${value.toFixed(1)}%` : value.toString();
  return value > 0 ? `+${formatted}` : formatted;
}

function getChangeType(value: number): 'positive' | 'negative' | 'neutral' {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

export function generateKpiRenderProps(
  explore: RepeatedRecordField,
  metadata: RenderMetadata
): KpiRenderProps {
  const tag = explore.tag;
  const kpiTag = tag.tag('kpi');
  if (!kpiTag) {
    throw new Error('KPI should only be rendered for kpi tag');
  }

  const settings = getKpiSettings(explore);

  const valueFieldName = settings.valueChannel.fields.at(0);
  const changeFieldName = settings.changeChannel.fields.at(0);

  if (!valueFieldName) {
    throw new Error('Malloy KPI: Missing value field');
  }

  const valueField = explore.fields.find(f => f.name === valueFieldName);
  const changeField = changeFieldName ? explore.fields.find(f => f.name === changeFieldName) : null;

  if (!valueField) {
    throw new Error(`Malloy KPI: Value field '${valueFieldName}' not found`);
  }

  const mapMalloyDataToKpiData = (data: RepeatedRecordCell) => {
    const kpiData: KpiData[] = [];
    
    // For KPI, we typically want to show one row of data
    // If there are multiple rows, we'll take the first one
    const firstRow = data.rows[0];
    if (firstRow) {
      const valueCell = firstRow.column(valueFieldName);
      const value = valueCell.value;
      
      let formattedValue = 'N/A';
      if (value !== null && typeof value === 'number') {
        formattedValue = renderNumericField(valueField, value);
      } else if (value !== null) {
        formattedValue = String(value);
      }

      let change: KpiData['change'] | undefined;
      if (changeField && changeFieldName) {
        const changeCell = firstRow.column(changeFieldName);
        const changeValue = changeCell.value;
        
        if (changeValue !== null && typeof changeValue === 'number') {
          // Determine if this looks like a percentage (between -100 and 100 with decimal places)
          const isPercentage = Math.abs(changeValue) <= 100 && changeValue % 1 !== 0;
          
          change = {
            value: formatChangeValue(changeValue, isPercentage),
            type: getChangeType(changeValue),
            percentage: isPercentage,
          };
        }
      }

      const title = settings.title || valueField.name || 'KPI';

      kpiData.push({
        title,
        value: formattedValue,
        change,
      });
    }

    return { data: kpiData };
  };

  return {
    data: [], // Will be populated by mapMalloyDataToKpiData
    chartType: 'kpi',
    chartTag: kpiTag,
    mapMalloyDataToKpiData,
  };
}

export function renderKpiHtml(props: KpiRenderProps): string {
  const { data } = props;
  
  if (data.length === 0) {
    return '<div class="kpi-container">No data available</div>';
  }

  const kpiCards = data.map(kpi => {
    const changeHtml = kpi.change ? `
      <div class="kpi-change kpi-change--${kpi.change.type}">
        ${kpi.change.value}
      </div>
    ` : '';

    return `
      <div class="kpi-card">
        <div class="kpi-title">${kpi.title}</div>
        <div class="kpi-value">${kpi.value}</div>
        ${changeHtml}
      </div>
    `;
  }).join('');

  return `
    <div class="kpi-container">
      ${kpiCards}
      <style>
        .kpi-container {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: transparent;
        }
        
        .kpi-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          min-width: 200px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: box-shadow 0.2s ease;
        }
        
        .kpi-card:hover {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .kpi-title {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .kpi-value {
          font-size: 32px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        
        .kpi-change {
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
        }
        
        .kpi-change--positive {
          color: #059669;
        }
        
        .kpi-change--positive::before {
          content: '↗';
          margin-right: 4px;
          font-size: 12px;
        }
        
        .kpi-change--negative {
          color: #dc2626;
        }
        
        .kpi-change--negative::before {
          content: '↘';
          margin-right: 4px;
          font-size: 12px;
        }
        
        .kpi-change--neutral {
          color: #6b7280;
        }
        
        .kpi-change--neutral::before {
          content: '→';
          margin-right: 4px;
          font-size: 12px;
        }
        
        @media (prefers-color-scheme: dark) {
          .kpi-card {
            background: #ffffff;
            border-color: #d1d5db;
          }
          
          .kpi-title {
            color: #6b7280;
          }
          
          .kpi-value {
            color: #111827;
          }
          
          .kpi-change--neutral {
            color: #6b7280;
          }
        }
        
        @media (max-width: 640px) {
          .kpi-container {
            gap: 12px;
          }
          
          .kpi-card {
            min-width: 160px;
            padding: 16px;
          }
          
          .kpi-value {
            font-size: 28px;
          }
        }
      </style>
    </div>
  `;
} 