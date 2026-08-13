import { expect, test, vi } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import { Banner } from './Banner.js';
import {
    Keys,
    press,
    renderAndSettle,
} from '../../../testUtils/inkTestHelpers.js';

test('Enter calls onActivate with the item', async () => {
    const onActivate = vi.fn();
    const { stdin } = await renderAndSettle(
        <InputEventProvider>
            <Banner
                label="Running"
                item="run-42"
                highlighted={true}
                onActivate={onActivate}
            />
        </InputEventProvider>,
    );

    await press(stdin, Keys.return);

    expect(onActivate).toHaveBeenCalledWith('run-42');
});

test('Enter with no item does not call onActivate', async () => {
    const onActivate = vi.fn();
    const { stdin } = await renderAndSettle(
        <InputEventProvider>
            <Banner
                label="Running"
                item={null}
                highlighted={true}
                onActivate={onActivate}
            />
        </InputEventProvider>,
    );

    await press(stdin, Keys.return);

    expect(onActivate).not.toHaveBeenCalled();
});
