import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem("oyuncak.nickname.asked", "1");
    localStorage.setItem(
      "oyuncak.preferences.v1",
      JSON.stringify({
        shareScores: false,
        reducedMotion: true,
        breakMinutes: 0,
      }),
    );
  });
  await context.route(/googleapis\.com|firebaseio\.com/, (r) => r.abort());
});
test("night garden discovery leads to real games and creative tools", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bir dünya hayal et." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Oyunları keşfet", exact: true })
    .click();
  await expect(page).toHaveURL(/\/games$/);
  await page.getByRole("button", { name: "Zeka", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hafıza Oyunu", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Balon Patlat", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Ana gezinme" })
    .getByRole("button", { name: "Çizim", exact: true })
    .click();
  await expect(page.locator("canvas").first()).toBeVisible();
});
test("theme changes contrast and persists without losing game choices", async ({
  page,
}) => {
  await page.goto("/");
  const dark = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  await page
    .getByRole("button", { name: "Açık temaya geç", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    )
    .not.toEqual(dark);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Koyu temaya geç", exact: true }),
  ).toBeVisible();
});

test("game HUD remains readable after choosing the light theme", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Açık temaya geç", exact: true })
    .click();
  await page.goto("/games/snake");
  await expect(
    page.getByRole("button", { name: "Oyunlara Dön", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", {name: /OYNA|BAŞLA|Başla|Başlat/}).first().click();
  const score = page.getByText("⭐ 0", { exact: true });
  await expect(score).toBeVisible();
  const contrast = await score.evaluate((element) => {
    const rgb = getComputedStyle(element)
      .color.match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number);
    const linear = rgb.map((value) => {
      const v = value / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    const luminance =
      0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    // The authored Snake HUD uses a nearly black, translucent panel.
    return (luminance + 0.05) / (0.01 + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});


test("2048 restart control stays readable before hovering", async ({ page }) => {
  await page.goto("/games/2048");
  await page.getByRole("button", { name: /BAŞLA/ }).click();
  await page.mouse.move(0, 0);
  const restart = page.getByRole("button", { name: "Yeniden başlat", exact: true });
  await expect(restart).toBeVisible();
  const contrast = await restart.evaluate(element => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => {
      const values = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
        const v = value / 255;
        return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
      });
      return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
    };
    const fg = luminance(style.color);
    const bg = luminance(style.backgroundColor);
    return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
