/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {ChartTooltipEntry} from '../types';
import type {Item, View} from 'vega';

export function getCustomTooltipEntries(
  item: Item,
  view: View
): ChartTooltipEntry | null {
  const datum = item.datum;
  if (!datum) return null;

  const category = datum.category;
  const value = datum.value;
  const percentage = datum.percentage;

  const title = [String(category)];

  const entries = [
    {
      label: 'Value',
      value: String(value),
      highlight: false,
      entryType: 'list-item' as const,
    },
    {
      label: 'Percentage',
      value: `${percentage}%`,
      highlight: false,
      entryType: 'list-item' as const,
    },
  ];

  return {
    title,
    entries,
  };
} 