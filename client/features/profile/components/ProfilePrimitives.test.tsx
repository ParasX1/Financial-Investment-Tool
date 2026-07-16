import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import { ProfileField } from "./ProfileField";
import { ProfileSettingRow } from "./ProfileSettingRow";

function TestIcon() {
  return <svg aria-label="Test icon" />;
}

describe("profile form primitives", () => {
  it("connects field help and errors to the editable input", () => {
    const onChange = jest.fn();
    const renderer = TestRenderer.create(
      <ProfileField
        error="Enter a valid phone number."
        helperText="Use 7 to 15 digits."
        id="profile-phone"
        label="Phone"
        value="123"
        onChange={onChange}
      />,
    );
    const input = renderer.root.findByType("input");

    expect(input.props["aria-invalid"]).toBe(true);
    expect(input.props["aria-describedby"]).toBe(
      "profile-phone-help profile-phone-error",
    );
    act(() => input.props.onChange({ target: { value: "456" } }));
    expect(onChange).toHaveBeenCalledWith("456");
    renderer.unmount();
  });

  it("keeps primary and secondary setting actions explicit", () => {
    const onAction = jest.fn();
    const onSecondaryAction = jest.fn();
    const renderer = TestRenderer.create(
      <ProfileSettingRow
        actionLabel="Edit"
        description="Account email"
        icon={TestIcon}
        label="Email"
        secondaryActionLabel="Verify"
        status="Pending"
        statusTone="warning"
        value="student@example.com"
        onAction={onAction}
        onSecondaryAction={onSecondaryAction}
      />,
    );

    const buttons = renderer.root.findAllByType("button");
    expect(buttons).toHaveLength(2);
    act(() => buttons[0].props.onClick());
    act(() => buttons[1].props.onClick());
    expect(onSecondaryAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledTimes(1);
    renderer.unmount();
  });
});
