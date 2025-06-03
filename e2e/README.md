# E2E Tests for Estimator Form

## Overview

These tests verify the basic functionality of the EstimatorForm component without worrying about network requests or authentication.

## Key Features

- **Handles Welcome Dialog**: Automatically dismisses the welcome dialog that appears on first visit
- **Tests Form Behavior**: Verifies button states, input handling, and UI elements
- **No Network Dependencies**: Focuses on UI behavior without API calls

## Running Tests

```bash
# Run all tests
npm test

# Run with UI mode (recommended for debugging)
npm run test:ui

# Run tests in headed mode to see the browser
npm test -- --headed
```

## Test Coverage

The tests verify:
1. All form elements are displayed correctly
2. Create button is initially disabled
3. Input field receives focus on page load
4. Button enables/disables based on input content
5. Empty/whitespace input keeps button disabled
6. Keyboard shortcut hint is displayed

## Prerequisites

- Backend API should be running (checked by global setup)
- Frontend dev server will start automatically
- Playwright browsers must be installed: `npx playwright install`