"use client";
import {
  useCalendar
} from "./chunk-VSP64EKQ.mjs";
import {
  CalendarBase
} from "./chunk-UH4WMPQO.mjs";
import {
  CalendarProvider
} from "./chunk-HCKEJHY3.mjs";

// src/calendar.tsx
import { forwardRef } from "@nextui-org/system";
import { jsx } from "react/jsx-runtime";
function Calendar(props, ref) {
  const { context, getBaseCalendarProps } = useCalendar({ ...props, ref });
  return /* @__PURE__ */ jsx(CalendarProvider, { value: context, children: /* @__PURE__ */ jsx(CalendarBase, { ...getBaseCalendarProps() }) });
}
Calendar.displayName = "NextUI.Calendar";
var calendar_default = forwardRef(Calendar);

export {
  calendar_default
};
