import { expect, test } from "@playwright/test";

test("shows the Handsel prototype when the landing page loads", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  // Given: the Handsel web application is running.

  // When: a visitor opens the landing page.
  await page.goto("/");

  // Then: the product identity and primary call to action are visible.
  await expect(
    page.getByRole("heading", {
      name: "Turn every promise into progress you can prove.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Book a demo →" })).toHaveCount(
    2,
  );
  expect(consoleErrors.join("\n")).not.toContain("A tree hydrated");
});
