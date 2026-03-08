import { Page } from "npm:playwright@^1.58.2";
import { assert, assertEquals } from "jsr:@std/assert";

export async function runUITests(page: Page) {
  console.log("\n--- STARTING UI HAPPY PATH TESTS ---");
  
  // 1. Navigate to the main page
  await page.goto("http://localhost:5173/");
  
  // Clear localStorage to start fresh
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // 2. Add a new person
  const newPersonName = "TestBot-" + Math.floor(Math.random() * 1000);
  console.log(`Adding person: ${newPersonName}`);
  
  await page.fill('input[placeholder="Enter name (e.g., Alice)"]', newPersonName);
  await page.click('button:text("Add")');

  // Verify person is in the list
  await page.waitForSelector(`text=${newPersonName}`);
  console.log("✅ Person added successfully");

  // 3. Manually assign this person to the 15th
  console.log("Setting manual assignment on day 15...");
  
  // Initially pick the one NOT grayed out
  const day15Initial = page.locator('div.cursor-pointer:not(.bg-gray-50)').filter({ hasText: /^15$/ }).first();
  await day15Initial.scrollIntoViewIfNeeded();
  await day15Initial.click();
  
  // Wait for dropdown
  const dropdown = page.locator('div.absolute.inset-0.z-10');
  await dropdown.waitFor({ state: 'visible' });
  
  // Select the person from the dropdown
  const personButton = dropdown.locator('button').filter({ hasText: new RegExp(`^\\s*${newPersonName}(\\s|$)`) });
  await personButton.first().click();
  
  // Verify assignment
  await dropdown.waitFor({ state: 'hidden' });
  
  // Re-fetch with flexible regex to handle labels
  const assignedCell = page.locator('div.cursor-pointer').filter({ hasText: new RegExp(`^15.*${newPersonName}`) });
  
  await assignedCell.waitFor({ state: 'visible', timeout: 5000 });
  const hasManual = await assignedCell.locator('text=Manual').isVisible();
  assert(hasManual, "Manual label should be visible on the assigned cell");
  console.log("✅ Manual assignment verified");

  // 4. Click "Generate Schedule"
  console.log("Generating schedule...");
  await page.click('button:has-text("Generate Schedule")');

  // Wait for generation to finish
  await page.waitForSelector('button:has-text("Generate Schedule"):not([disabled])', { timeout: 30000 });
  
  // Verify that other days now have assignments
  await page.waitForTimeout(1000);
  const assignmentsCount = await page.locator('div.mt-auto.mb-1').count();
  console.log(`Found ${assignmentsCount} total assignments in the calendar`);
  
  assert(assignmentsCount > 1, "Schedule generation failed: Only 1 assignment found (the manual one)");
  console.log("✅ Schedule generated successfully");

  console.log("--- UI HAPPY PATH TESTS PASSED ---");
}
