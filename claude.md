# claude-code-github

**An MCP server for Claude Code that automates your Git workflow, from local commits to GitHub pull requests.**

## What it is

`claude-code-github` is a local server that acts as a powerful assistant for your development tasks. You configure your Claude Code environment to talk to this server, which works in two ways:

1.  **Background Monitoring:** It uses efficient, OS-native filesystem events to watch your project files for changes. It then provides a real-time status summary to Claude, allowing the LLM to decide on the appropriate action, such as suggesting a commit, creating a new feature branch, or summarizing the work in progress.
2.  **Claude Tools:** It provides a set of tools that Claude can use on your behalf. You can ask Claude to "create a pull request for the current feature," and the server will handle the interaction with the Git command line and the GitHub API.

This server makes you more efficient by connecting the intelligence of Claude directly to your local Git environment. It helps you follow best practices (like conventional commits and not committing to `main`) by empowering the LLM to execute these actions for you.

## Installation

`claude-code-github` is a Node.js package. To run it, you must have a recent version of [Node.js](https://nodejs.org/) (which includes npm and npx) installed on your system.

### Via npx (Recommended)

The recommended way to run the server is with `npx`, which ensures you are always using the latest version of the package without needing to install it globally. The server is executed on-demand, as shown in the configuration section.

### Global Installation (Optional)

If you prefer, you can install the package globally using npm:

```bash
npm install -g @jdrhyne/claude-code-github
```

This will make the `claude-code-github` command directly available in your shell.

## Configuration

There are two parts to configure: telling Claude Code how to find the server, and telling the server how to manage your projects.

### Step 1: Configure Claude Code

First, run the `claude-code-github` server in your terminal to initiate the setup.

```bash
npx @jdrhyne/claude-code-github@latest
```

The server communicates over `stdin`/`stdout` using the **JSON-RPC 2.0** protocol.

Next, edit the Claude Code configuration file (e.g., `~/.claude/config.json`) to add the `mcp_server` key. This tells Claude how to start and connect to your new server using `npx`.

```json
{
  "mcpServers": {
    "claude-code-github": {
      "command": "npx",
      "args": [
        "-y",
        "@jdrhyne/claude-code-github@latest"
      ]
    }
  }
}
```

*(Note: If you chose the global installation method, you could use `"claude-code-github"` as the command with no args.)*

### Step 2: Configure the `claude-code-github` Server

On its first run, the server will automatically create a configuration file at `~/.config/claude-code-github/config.yml`. You will need to edit this file to set up your projects.

You will be prompted on the command line to create a GitHub Personal Access Token with `repo` and `workflow` scopes. This token will be stored securely in your system's native keychain (e.g., macOS Keychain, Windows Credential Manager), not in the config file. If the token expires or is revoked, the server will re-prompt you when a GitHub action fails.

Here is an example `config.yml`:

```yaml
# Global settings for the claude-code-github server
# Full documentation available at https://github.com/your-org/claude-code-github

# Default Git workflow settings.
git_workflow:
  main_branch: main
  protected_branches:
    - main
    - develop
  branch_prefixes:
    feature: feature/
    bugfix: bugfix/
    refactor: refactor/

# A list of projects for the server to monitor.
# Use absolute paths.
projects:
  - path: "/Users/steve/Documents/Projects/my-awesome-app"
    github_repo: "your-username/my-awesome-app"
    # Project-specific overrides (optional)
    reviewers:
      - "github-user1"
      - "github-user2"

  - path: "/Users/steve/Documents/Projects/another-project"
    github_repo: "your-username/another-project"
```

## How it works

The `claude-code-github` server runs continuously in the background.

1.  **File Watcher:** It monitors the file systems of the projects you listed in `config.yml` using efficient OS-native events.
2.  **Change Analysis:** When it detects changes, it prepares a detailed summary, including a file list, status (modified, added, etc.), and a text `diff` of the code changes.
3.  **Passive Information Provider:** The server is passive. It does not trigger any actions on its own. It provides its analysis to Claude through the `development.status` tool. All actions, such as creating a commit or a new branch, are initiated explicitly by the LLM agent using the provided tools.

## Tools Exposed to Claude

The server provides the following tools for Claude to use:

  * **`development.status()`**
    Provides a JSON object summarizing the current state of the active project. This is the primary tool for Claude to assess the situation and decide what to do next.

    *Claude, what's the status of my current project?*

    **Output Schema:**

    ```json
    {
      "branch": "main",
      "is_protected": true,
      "uncommitted_changes": {
        "file_count": 7,
        "diff_summary": "--- a/file1.js\n+++ b/file1.js\n@@ -1,3 +1,4 @@\n console.log('hello');\n+console.log('world');\n ...",
        "files_changed": [
          {"file": "src/component.js", "status": "Modified"},
          {"file": "src/new_service.js", "status": "Added"}
        ]
      }
    }
    ```

  * **`development.create_branch(name: string, type: string, message: string)`**
    Creates and checks out a new branch with the appropriate prefix (`feature/`, `bugfix/`, etc.) and commits the current outstanding changes to this new branch using a message supplied by Claude.

    *Claude, create a new feature branch called `user-profile-page` with the commit message "feat: Add initial structure for profile page".*

  * **`development.create_pull_request(title: string, body: string, is_draft: bool = true)`**
    Pushes the current branch to GitHub and creates a pull request.

    *Claude, open a draft pull request for my current branch.*

  * **`development.checkpoint(message: string)`**
    Manually triggers a commit of all current changes with a specific message provided by Claude.

    *Claude, make a checkpoint with the message "WIP: setting up the database models".*

  * **Commit Message Formatting:** For any tool accepting a `message` parameter, the server will preserve all formatting provided by Claude (including Markdown like lists with `*` or `-`) and pass it directly to the `git commit` command.

## Safeguards

  * **Protected Branches:** The server will refuse to perform any operations that would result in a direct commit to a branch listed in the `protected_branches` array.
  * **User Prompts for Confirmation:** For significant actions like creating a pull request, the tool's JSON-RPC response will include a confirmation field (e.g., `"confirmation_required": true`). It is the responsibility of the client application (Claude Code) to interpret this field and prompt the user for confirmation within their primary interface.
  * **Remote Mismatch Prevention:** The server will refuse to push to a remote if the `github_repo` in the configuration file does not align with the `origin` remote configured in the local Git repository, preventing accidental pushes to the wrong location. An error will be returned to Claude explaining the mismatch.