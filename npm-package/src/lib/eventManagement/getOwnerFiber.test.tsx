import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { expect, test } from 'vitest';
import { getOwnerFiber } from './getOwnerFiber.js';

test('returns the fiber of the component currently rendering', () => {
    let captured: unknown;
    function Probe() {
        captured = getOwnerFiber();
        return <Text>probe</Text>;
    }

    render(<Probe />);

    expect(captured).toMatchObject({ type: Probe, sibling: null });
});

test('throws when called outside of render', () => {
    expect(() => getOwnerFiber()).toThrow(
        'getOwnerFiber must be called synchronously during render.',
    );
});
