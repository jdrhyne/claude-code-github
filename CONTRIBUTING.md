# Contributing to claude-code-github

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to claude-code-github. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Style Guides](#style-guides)
  - [Git Commit Messages](#git-commit-messages)
  - [TypeScript Style Guide](#typescript-style-guide)
  - [Documentation Style Guide](#documentation-style-guide)

## Code of Conduct

This project and everyone participating in it is governed by the following Code of Conduct. By participating, you are expected to uphold this code. Please be respectful and considerate in all interactions.

## Getting Started

- Fork the repository on GitHub
- Clone your fork locally
- Set up the development environment (see [Development Setup](#development-setup))
- Create a new branch for your work
- Make your changes
- Run tests and ensure they pass
- Submit a pull request

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title** for the issue to identify the problem.
- **Describe the exact steps which reproduce the problem** in as many details as possible.
- **Provide specific examples to demonstrate the steps**.
- **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
- **Explain which behavior you expected to see instead and why.**
- **Include screenshots and animated GIFs** if possible.
- **Include your environment details** (OS, Node.js version, etc.).

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title** for the issue to identify the suggestion.
- **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
- **Provide specific examples to demonstrate the steps**.
- **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
- **Explain why this enhancement would be useful** to most users.

### Pull Requests

- Fill in the required template
- Do not include issue numbers in the PR title
- Follow the [TypeScript Style Guide](#typescript-style-guide)
- Include thoughtfully-worded, well-structured tests
- Document new code
- End all files with a newline

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)
- Git

### Setup Steps

1. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/claude-code-github.git
   cd claude-code-github
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

### Testing

- Write tests for any new functionality
- Ensure all tests pass before submitting a PR
- Run tests with: `npm test`
- Run tests in watch mode: `npm run test:watch`
- Run E2E tests: `npm run test:e2e`

## Style Guides

### Git Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

Types:
- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests or correcting existing tests
- `build:` Changes that affect the build system or external dependencies
- `ci:` Changes to our CI configuration files and scripts
- `chore:` Other changes that don't modify src or test files

### TypeScript Style Guide

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Follow the existing code style in the project
- Run `npm run lint` to check for style issues

### Documentation Style Guide

- Use Markdown for documentation
- Reference functions and classes with backticks
- Include code examples where appropriate
- Keep explanations clear and concise
- Update the README.md if your changes affect user-facing functionality

## Questions?

Feel free to open an issue with the "question" label if you need clarification on anything!