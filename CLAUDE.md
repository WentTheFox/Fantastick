# Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow:

```
<type>[optional scope]: <description>
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`.

This is enforced by commitlint (`commitlint.config.js`, husky `commit-msg` hook, and the `Commitlint` CI workflow on pull requests) and is not optional — do not bypass it with `--no-verify`.

It matters beyond style: `.github/workflows/docker-publish.yml` derives the published container image's version from these commit types on every push to `main` (`feat` → minor bump, `fix`/other recognized types → patch bump, `BREAKING CHANGE`/`!` → major bump). A commit that doesn't follow the convention won't be picked up correctly by that version bump.
