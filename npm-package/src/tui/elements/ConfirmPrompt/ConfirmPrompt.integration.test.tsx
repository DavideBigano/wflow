import { render } from 'ink-testing-library';
import { expect, test, vi } from 'vitest';
import {
    InputEventProvider,
    useInputListener,
} from '../../../lib/inputEventProvider/index.js';
import { ConfirmPrompt } from './ConfirmPrompt.js';

/** ink attaches its raw-mode input listener in an effect after mount, and registration/callback effects run asynchronously; flush a macrotask to let them all settle. */
function flush() {
    return new Promise((resolve) => setImmediate(resolve));
}

async function press(stdin: ReturnType<typeof render>['stdin'], key: string) {
    stdin.write(key);
    await flush();
}

function Parent({ onKey }: { onKey: () => void }) {
    useInputListener(() => {
        onKey();
    });
    return null;
}

test("parent's useInputListener callback doesn't fire while ConfirmPrompt is mounted", async () => {
    const onKey = vi.fn();

    const { stdin } = render(
        <InputEventProvider>
            <Parent onKey={onKey} />
            <ConfirmPrompt
                prompt="Archive this run?"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        </InputEventProvider>,
    );
    await flush();

    await press(stdin, 'x');

    expect(onKey).not.toHaveBeenCalled();
});
