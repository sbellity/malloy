/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {RepeatedRecordField} from '../../data_tree';
import type {Tag} from '@malloydata/malloy-tag';

export interface KpiSettings {
  valueChannel: {
    fields: string[];
  };
  changeChannel: {
    fields: string[];
  };
  title?: string;
}

export function getKpiSettings(
  explore: RepeatedRecordField
): KpiSettings {
  const tag = explore.tag;
  const kpiTag = tag.tag('kpi');
  
  if (!kpiTag) {
    throw new Error('KPI settings should only be called for kpi tag');
  }

  // Get explicit field mappings from tag
  const explicitValue = kpiTag.text('value');
  const explicitChange = kpiTag.text('change');
  const title = kpiTag.text('title');

  // Auto-detect fields if not explicitly specified
  const allFields = explore.fields;
  
  // Value field: first numeric field or explicitly specified
  let valueFields: string[] = [];
  if (explicitValue) {
    const valueField = allFields.find(f => f.name === explicitValue);
    if (valueField) {
      valueFields = [valueField.name];
    }
  } else {
    // Auto-detect: first numeric field
    const numericField = allFields.find(f => f.isNumber());
    if (numericField) {
      valueFields = [numericField.name];
    }
  }

  // Change field: second numeric field or explicitly specified
  let changeFields: string[] = [];
  if (explicitChange) {
    const changeField = allFields.find(f => f.name === explicitChange);
    if (changeField) {
      changeFields = [changeField.name];
    }
  } else {
    // Auto-detect: second numeric field (if available)
    const numericFields = allFields.filter(f => f.isNumber());
    if (numericFields.length > 1) {
      changeFields = [numericFields[1].name];
    }
  }

  return {
    valueChannel: {
      fields: valueFields,
    },
    changeChannel: {
      fields: changeFields,
    },
    title,
  };
} 