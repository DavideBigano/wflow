import { expect, test, vi } from 'vitest';
import {
    InputEventProvider,
    useInputListener,
} from '../../../lib/inputEventProvider/index.js';
import { press, renderAndSettle } from '../../../testUtils/inkTestHelpers.js';
import { ConfirmPrompt } from './ConfirmPrompt.js';

function Parent({ onKey }: { onKey: () => void }) {
    useInputListener(() => {
        onKey();
    });
    return null;
}

test("parent's useInputListener callback doesn't fire while ConfirmPrompt is mounted", async () => {
    const onKey = vi.fn();

    const { stdin } = await renderAndSettle(
        <InputEventProvider>
            <Parent onKey={onKey} />
            <ConfirmPrompt
                prompt="Archive this run?"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        </InputEventProvider>,
    );

    await press(stdin, 'x');

    expect(onKey).not.toHaveBeenCalled();
});
