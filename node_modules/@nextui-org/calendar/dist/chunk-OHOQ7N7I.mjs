"use client";
import {
  useRangeCalendar
} from "./chunk-BOFTCDA7.mjs";
import {
  CalendarBase
} from "./chunk-UH4WMPQO.mjs";
import {
  CalendarProvider
} from "./chunk-HCKEJHY3.mjs";

// src/range-calendar.tsx
import { forwardRef } from "@nextui-org/system";
import { jsx } from "react/jsx-runtime";
function RangeCalendar(props, ref) {
  const { context, getBaseCalendarProps } = useRangeCalendar({ ...props, ref });
  return /* @__PURE__ */ jsx(CalendarProvider, { value: context, children: /* @__PURE__ */ jsx(CalendarBase, { ...getBaseCalendarProps() }) });
}
RangeCalendar.displayName = "NextUI.RangeCalendar";
var range_calendar_default = forwardRef(RangeCalendar);

export {
  range_calendar_default
};
