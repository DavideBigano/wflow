import { expect, test, vi } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import { Button } from './Button.js';
import {
    Keys,
    press,
    renderAndSettle,
} from '../../../testUtils/inkTestHelpers.js';

test('Enter calls onSelection', async () => {
    const onSelection = vi.fn();
    const { stdin } = await renderAndSettle(
        <InputEventProvider>
            <Button
                text="refresh"
                highlighted={true}
                onSelection={onSelection}
            />
        </InputEventProvider>,
    );

    await press(stdin, Keys.return);

    expect(onSelection).toHaveBeenCalledOnce();
});
