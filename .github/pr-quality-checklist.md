# PR Quality Checklist

## Code Quality ✓
- [ ] All linting errors fixed (`npm run lint`)
- [ ] All tests passing (`npm test`)
- [ ] No `console.log` statements
- [ ] No `any` types
- [ ] TypeScript strict mode compatible

## Documentation ✓
- [ ] JSDoc comments on public APIs
- [ ] README updated if needed
- [ ] Inline comments for complex logic
- [ ] Examples provided for new features

## Testing ✓
- [ ] Unit tests for new code
- [ ] Integration tests where appropriate
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Test coverage maintained or improved

## Security ✓
- [ ] No hardcoded secrets
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting considered
- [ ] Audit logging for sensitive operations

## Performance ✓
- [ ] No obvious performance issues
- [ ] Large operations are async
- [ ] Memory leaks prevented
- [ ] Caching used where appropriate

## Code Structure ✓
- [ ] Single responsibility principle
- [ ] DRY (Don't Repeat Yourself)
- [ ] Functions < 50 lines
- [ ] Clear naming conventions
- [ ] Proper error handling

## PR Hygiene ✓
- [ ] PR description is clear
- [ ] Commits are logical and well-messaged
- [ ] PR size is reasonable (< 1000 lines)
- [ ] Breaking changes documented
- [ ] Issue reference included