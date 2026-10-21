import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ToastProvider } from "@/components/shared/Toast";
import { TextTab } from "./TextTab";

function pasteIntoTextTab(text: string) {
  render(
    <ToastProvider>
      <TextTab />
    </ToastProvider>,
  );
  const input = screen.getAllByRole("textbox")[0];
  fireEvent.paste(input, { clipboardData: { getData: () => text } });
}

const switchedNotice = () => screen.queryByText(/Looks like base64/);

describe("TextTab paste", () => {
  // Vitest globals are off, so Testing Library does not clean up on its own.
  afterEach(cleanup);

  it.each(["password123", "hello-world", "2024-01-15", "user_id_123"])(
    "stays in Encode when %s is pasted",
    (text) => {
      pasteIntoTextTab(text);
      expect(switchedNotice()).not.toBeInTheDocument();
      expect(screen.getByText("Base64 output")).toBeInTheDocument();
    },
  );

  it.each(["SGVsbG8=", "aGVsbG8gd29ybGQ"])("switches to Decode when base64 of text %s is pasted", (b64) => {
    pasteIntoTextTab(b64);
    expect(switchedNotice()).toBeInTheDocument();
    expect(screen.getByText("Decoded text")).toBeInTheDocument();
  });
});
