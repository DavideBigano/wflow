import { render } from 'ink-testing-library';
import { describe, expect, test } from 'vitest';
import type { RegistryElement } from '../../ListenerRegistry.js';
import { InputEventContext } from '../InputEventProvider/InputEventProvider.js';
import { InputChainDevtools } from './InputChainDevtools.js';

const shell: RegistryElement = {
    id: 'abcde',
    name: 'Shell',
    fiber: { return: null, child: null, sibling: null },
    fallbackElement: null,
    listener: () => {},
    isActive: true,
};
const archiverTopic: RegistryElement = {
    id: '12345',
    name: 'ArchiverTopic',
    fiber: { return: null, child: null, sibling: null },
    fallbackElement: null,
    listener: () => {},
    isActive: true,
};
const runDisplay: RegistryElement = {
    id: '1a1a1',
    name: 'RunDisplay',
    fiber: { return: null, child: null, sibling: null },
    fallbackElement: null,
    listener: () => {},
    isActive: true,
};

function createContext(options?: {
    registry?: readonly RegistryElement[];
    focused?: RegistryElement | null;
}): InputEventContext {
    return {
        registry: { current: options?.registry || [] },
        focused: options?.focused || null,
        setFocused: () => null,
    };
}

describe('InputChainDevtools', () => {
    test('lists entries in the order given', () => {
        const context = createContext({
            registry: [shell, archiverTopic, runDisplay],
        });

        const { lastFrame } = render(
            <InputEventContext.Provider value={context}>
                <InputChainDevtools />
            </InputEventContext.Provider>,
        );

        expect(lastFrame()).toMatchSnapshot();
    });

    test('highlights the focused entry', () => {
        const context = createContext({
            registry: [shell, archiverTopic, runDisplay],
            focused: runDisplay,
        });

        const { lastFrame } = render(
            <InputEventContext.Provider value={context}>
                <InputChainDevtools />
            </InputEventContext.Provider>,
        );

        expect(lastFrame()).toMatchSnapshot();
    });

    test('renders an empty-state placeholder with no entries', () => {
        const context = createContext();

        const { lastFrame } = render(
            <InputEventContext.Provider value={context}>
                <InputChainDevtools />
            </InputEventContext.Provider>,
        );

        expect(lastFrame()).toMatchSnapshot();
    });
});
