/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {RepeatedRecordCell} from '../../data_tree';
import {generateKpiRenderProps, renderKpiHtml} from './render-kpi';
import {createResultStore} from '../result-store/result-store';

export function Kpi(props: {data: RepeatedRecordCell}) {
  try {
    // Create a minimal metadata object for KPI rendering
    const metadata = {
      store: createResultStore(),
      vega: {},
      root: null as any, // KPI doesn't need root
      parentSize: {width: 0, height: 0},
      renderAs: 'kpi' as const,
      sizingStrategy: 'fill' as const,
    };

    const kpiProps = generateKpiRenderProps(props.data.field, metadata);
    const processedData = kpiProps.mapMalloyDataToKpiData(props.data);
    const finalProps = {
      ...kpiProps,
      data: processedData.data,
    };
    
    const htmlContent = renderKpiHtml(finalProps);
    
    return (
      <div innerHTML={htmlContent} />
    );
  } catch (error) {
    console.error('KPI rendering error:', error);
    return (
      <div class="kpi-error" style="padding: 20px; border: 1px solid #dc2626; border-radius: 8px; background: #fef2f2; color: #dc2626;">
        <strong>Error rendering KPI:</strong> {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }
} 