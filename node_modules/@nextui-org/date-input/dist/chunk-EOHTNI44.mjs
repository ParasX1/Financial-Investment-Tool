"use client";
import {
  DateInputField
} from "./chunk-L4FOSONL.mjs";
import {
  DateInputGroup
} from "./chunk-YVBCSFY6.mjs";
import {
  useDateInput
} from "./chunk-IQQH4X7S.mjs";

// src/date-input.tsx
import { forwardRef } from "@nextui-org/system";
import { jsx } from "react/jsx-runtime";
function DateInput(props, ref) {
  const { state, slots, classNames, getBaseGroupProps, getInputProps, getFieldProps } = useDateInput({
    ...props,
    ref
  });
  return /* @__PURE__ */ jsx(DateInputGroup, { ...getBaseGroupProps(), children: /* @__PURE__ */ jsx(
    DateInputField,
    {
      classNames,
      inputProps: getInputProps(),
      slots,
      state,
      ...getFieldProps()
    }
  ) });
}
DateInput.displayName = "NextUI.DateInput";
var date_input_default = forwardRef(DateInput);

export {
  date_input_default
};
