/** An error with an optional actionable hint, shown alongside the message when reported. */
export class WflowError extends Error {
    readonly hint?: string;

    constructor(message: string, hint?: string) {
        super(message);
        this.name = 'WflowError';
        this.hint = hint;
    }
}

/** Renders any thrown value as a two-line `error:`/`hint:` report, falling back gracefully for non-WflowErrors. */
export function describeError(error: unknown): string {
    if (error instanceof WflowError) {
        const lines = [`error: ${error.message}`];
        if (error.hint) lines.push(`hint:  ${error.hint}`);
        return lines.join('\n');
    }
    if (error instanceof Error) return `error: ${error.message}`;
    return `error: ${String(error)}`;
}
