/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import type {Tag} from '@malloydata/malloy-tag';
import type {Channel} from '../types';
import type {RepeatedRecordField} from '../../data_tree';
import {walkFields} from '../../util';

export type PieChartSettings = {
  categoryChannel: Channel;
  valueChannel: Channel;
  interactive: boolean;
  hideReferences: boolean;
};

export function getPieChartSettings(
  explore: RepeatedRecordField,
  tagOverride?: Tag
): PieChartSettings {
  const tag = tagOverride ?? explore.tag;
  const chart = tag.tag('pie_chart') ?? tag.tag('pie');
  // if tooltip, disable interactions
  const interactive = !tag.has('tooltip');
  const isSpark =
    chart?.text('size') === 'spark' || tag.text('size') === 'spark';
  if (!chart) {
    throw new Error(
      'Tried to render a pie_chart, but no pie_chart tag was found'
    );
  }

  const categoryChannel: Channel = {
    fields: [],
    type: null,
  };

  const valueChannel: Channel = {
    fields: [],
    type: null,
  };

  function getField(ref: string) {
    return explore.pathTo(explore.fieldAt([ref]));
  }

  // Parse top level tags
  if (chart.text('category')) {
    categoryChannel.fields.push(getField(chart.text('category')!));
  }
  if (chart.text('value')) {
    valueChannel.fields.push(getField(chart.text('value')!));
  }

  // Parse embedded tags
  const embeddedCategory: string[] = [];
  const embeddedValue: string[] = [];
  walkFields(explore, field => {
    const tag = field.tag;
    const pathTo = explore.pathTo(field);
    if (tag.has('category')) {
      embeddedCategory.push(pathTo);
    }
    if (tag.has('value')) {
      embeddedValue.push(pathTo);
    }
  });

  // Add all categories found
  embeddedCategory.forEach(path => {
    categoryChannel.fields.push(path);
  });

  // Add all values found
  embeddedValue.forEach(path => {
    valueChannel.fields.push(path);
  });

  const dimensions = explore.fields.filter(
    f => f.isBasic() && f.wasDimension()
  );

  // If still no category or value, attempt to pick the best choice
  if (categoryChannel.fields.length === 0) {
    // Pick first dimension field for category
    if (dimensions.length > 0) {
      categoryChannel.fields.push(explore.pathTo(dimensions[0]));
    }
  }
  if (valueChannel.fields.length === 0) {
    // Pick first numeric measure field
    const numberField = explore.fields.find(
      f => f.wasCalculation() && f.isNumber()
    );
    if (numberField) valueChannel.fields.push(explore.pathTo(numberField));
  }

  // Set channel types
  categoryChannel.type = 'nominal';
  valueChannel.type = 'quantitative';

  return {
    categoryChannel,
    valueChannel,
    interactive,
    hideReferences: isSpark,
  };
} 