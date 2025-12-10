# Contributing to Refactor Discord Bot

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment for all contributors

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/)
- Discord Bot Token and Anthropic API Key (for testing)

### Setup Development Environment

1. **Fork and clone the repository**:

   ```bash
   git clone https://github.com/your-username/refactor-discord-bot.git
   cd refactor-discord-bot
   ```

2. **Install dependencies**:

   ```bash
   bun install
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.docker .env
   # Edit .env with your tokens and channel IDs
   ```

4. **Start development environment**:

   ```bash
   bun run docker:dev:bg
   ```

5. **View logs**:
   ```bash
   bun run docker:dev:logs
   ```

## Development Workflow

### Making Changes

1. **Create a new branch**:

   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** - The bot will hot reload automatically!

3. **Format your code**:

   ```bash
   bun run format
   ```

4. **Check formatting**:
   ```bash
   bun run format:check
   ```

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature (minor version bump)
- **fix**: A bug fix (patch version bump)
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semi-colons, etc)
- **refactor**: Code refactoring without changing functionality
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Build system or external dependencies
- **ci**: CI/CD configuration changes
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverting a previous commit

### Scope (Optional)

The scope provides additional contextual information:

- **recommendations**: Recommendation processing feature
- **claude**: Claude AI integration
- **database**: Database operations
- **docker**: Docker configuration
- **cache**: Caching layer

### Examples

#### Feature Addition

```
feat(recommendations): add support for Twitter link parsing

Add capability to extract and analyze Twitter/X links in recommendations.
Includes metadata extraction for tweet content and author information.
```

#### Bug Fix

```
fix(claude): handle rate limiting errors gracefully

Implement exponential backoff when Claude API returns rate limit errors.
Prevents bot crashes and ensures reliable processing.

Fixes #123
```

#### Documentation

```
docs(readme): update Docker installation instructions

Clarify steps for setting up Docker environment on Windows.
Add troubleshooting section for common Docker issues.
```

#### Breaking Change

```
feat(database)!: migrate to PostgreSQL 17

BREAKING CHANGE: Update to PostgreSQL 17 requires database migration.
See migration guide in UPGRADE.md for instructions.
```

### Commit Message Rules

✅ **DO**:

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Keep subject line under 72 characters
- Capitalize the subject line
- No period at the end of subject line
- Separate subject from body with a blank line
- Wrap body at 72 characters
- Use body to explain _what_ and _why_ vs. _how_

❌ **DON'T**:

- Use past tense
- Start with uppercase for type
- End subject with period
- Make vague commits ("fix stuff", "update code")

### Automatic Validation

When you commit, your commit message will be automatically validated by **commitlint**. If it doesn't follow the convention, the commit will be rejected with a helpful error message.

```bash
# This will be rejected:
git commit -m "fixed a bug"

# This will be accepted:
git commit -m "fix(claude): handle timeout errors"
```

## Pull Request Process

1. **Update documentation** if you're adding features
2. **Add tests** if applicable
3. **Ensure all checks pass**:
   - Commit messages follow convention
   - Code is formatted with Prettier
   - No TypeScript errors

4. **Create a Pull Request**:
   - Use a descriptive title following commit conventions
   - Describe what changes you made and why
   - Reference any related issues

5. **Wait for review**:
   - Address any feedback from maintainers
   - Keep your branch up to date with main

### Pull Request Title Format

PR titles should also follow commit conventions:

```
feat(recommendations): add support for Spotify podcasts
fix(docker): resolve volume mount permissions issue
docs(contributing): add commit message examples
```

## Automated Releases

This project uses **semantic-release** for automated versioning:

- Commits with `feat:` trigger a **minor** version bump (1.x.0)
- Commits with `fix:` trigger a **patch** version bump (1.0.x)
- Commits with `BREAKING CHANGE:` trigger a **major** version bump (x.0.0)
- Releases are automatically created on the `main` branch
- Changelog is automatically generated from commit messages

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Add types for all function parameters and return values
- Use interfaces over type aliases when possible

### Formatting

- We use **Prettier** for code formatting
- Configuration is in `.prettierrc.json`
- Run `bun run format` before committing
- Pre-commit hook will check formatting automatically

### File Organization

Follow the feature-based architecture:

```
src/features/your-feature/
├── events/          # Event handlers
├── services/        # Business logic
└── types/           # TypeScript types
```

## Testing

(Coming soon)

## Need Help?

- Check the [README.md](README.md) for general documentation
- Check [DEVELOPMENT.md](DEVELOPMENT.md) for development workflow
- Open an issue for bugs or feature requests
- Ask questions in pull requests or issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Refactor Discord Bot!** 🚀
