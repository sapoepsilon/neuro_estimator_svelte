# E2E Tests for EstimatorForm Fixes

This directory contains end-to-end tests specifically for the fixes implemented in the EstimatorForm component.

## Test Coverage

### Enter Key Functionality
- ✅ Pressing Enter submits the form when text is present
- ✅ Pressing Shift+Enter creates a new line instead of submitting
- ✅ Enter key does not submit when textarea is empty
- ✅ Enter key does not submit when textarea has only spaces

### Login Dialog Integration
- ✅ Login dialog appears when unauthenticated user submits form
- ✅ Form data persists after closing login dialog

### Navbar Login Button
- ✅ Navbar login button is clickable and opens login dialog
- ✅ Navbar login button works even when form has content
- ✅ Navbar remains accessible with proper z-index (no blocking)

### Mobile Submit Button
- ✅ Mobile submit button appears and works on small screens
- ✅ Mobile submit button is disabled when textarea is empty

### Form Textarea Auto-resize
- ✅ Textarea expands as content is added

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run specific test file
```bash
npx playwright test estimator-form-fixes.spec.js
```

### Run tests in headed mode (see browser)
```bash
npx playwright test estimator-form-fixes.spec.js --headed
```

### Run tests for specific browser
```bash
npx playwright test estimator-form-fixes.spec.js --project=chromium
npx playwright test estimator-form-fixes.spec.js --project=firefox
npx playwright test estimator-form-fixes.spec.js --project=webkit
```

### Debug tests
```bash
npx playwright test estimator-form-fixes.spec.js --debug
```

## CI/CD Integration

Tests are automatically run on GitHub Actions when:
- Code is pushed to main/master branch
- Pull requests are created

See `.github/workflows/playwright.yml` for the CI configuration.

## Test Structure

Each test group focuses on a specific feature:

1. **Enter Key Functionality**: Ensures the Enter key properly submits the form
2. **Login Dialog Integration**: Verifies authentication flow when not logged in
3. **Navbar Login Button**: Tests z-index fix and button accessibility
4. **Mobile Submit Button**: Tests mobile-specific UI elements
5. **Form Textarea Auto-resize**: Ensures textarea grows with content

## Maintenance

When modifying the EstimatorForm component, ensure all tests still pass by running:
```bash
npx playwright test estimator-form-fixes.spec.js
```

If UI changes are made, update the selectors in the tests accordingly.