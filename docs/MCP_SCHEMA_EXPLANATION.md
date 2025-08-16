## Expected MCP Tool Response Schema


### Standard MCP Response Format

```typescript
{
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
```

### For Tools with Output Schema

When a tool defines an `outputSchema`, Claude Desktop requires:

```typescript
{
  content: Array<{
    type: "text";
    text: string;
  }>;
  structuredContent: any; // MUST match outputSchema exactly
  isError?: boolean;
}
```

### Your Current Issue

The error "Tool has an output schema but no structured content was provided" means:

1. **Tool defines outputSchema** ✅ (You have this)
2. **Tool returns structuredContent** ✅ (You have this)  
3. **structuredContent matches outputSchema exactly** ❌ (This is the issue)

### The Problem

Your tools return this structure correctly:
```typescript
return {
  content: [{ type: "text", text: "..." }],
  structuredContent: { ... }
}
```

But Claude Desktop is stricter about schema validation than local testing.

### Solution

The `structuredContent` must **exactly** match the Zod schema shape. For example:

**docker_analyze_layers outputSchema:**
```typescript
{ 
  layers: z.array(z.object({
    size: z.number().optional(),
    digest: z.string().optional()
  })), 
  totalSize: z.number() 
}
```

**Must return structuredContent:**
```typescript
{
  layers: [
    { size: 12345, digest: "sha256:..." }, // ✅ Matches schema
    { size: 67890 }                        // ✅ digest optional
  ],
  totalSize: 123456                        // ✅ Required number
}
```

**Cannot return:**
```typescript
{
  layers: [{ unknownField: "value" }], // ❌ Extra fields not in schema
  totalSize: "123456"                  // ❌ Wrong type (string vs number)
}
```

This explains why it works locally (less strict validation) but at times fails in Claude Desktop (strict validation).
