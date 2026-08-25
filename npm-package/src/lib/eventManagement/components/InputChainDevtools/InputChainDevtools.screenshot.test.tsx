import { render } from 'ink-testing-library';
import { describe, expect, test } from 'vitest';
import type { FiberNode, RegistryElement } from '../../ListenerRegistry.js';
import { InputEventContext } from '../InputEventProvider/InputEventProvider.js';
import { InputChainDevtools } from './InputChainDevtools.js';

const shellFiber: FiberNode = {
    return: null,
    child: null,
    sibling: null,
};

const archiverTopicFiber: FiberNode = {
    return: null,
    child: null,
    sibling: null,
};

const runDisplayFiber: FiberNode = {
    return: null,
    child: null,
    sibling: null,
};

shellFiber.child = archiverTopicFiber;
archiverTopicFiber.return = shellFiber;
archiverTopicFiber.child = runDisplayFiber;
runDisplayFiber.return = archiverTopicFiber;

const shell: RegistryElement = {
    id: 'abcde',
    name: 'Shell',
    fiber: shellFiber,
    fallbackElement: null,
    listener: () => {},
    isActive: true,
    focusable: true,
};
const archiverTopic: RegistryElement = {
    id: '12345',
    name: 'ArchiverTopic',
    fiber: archiverTopicFiber,
    fallbackElement: null,
    listener: () => {},
    isActive: true,
    focusable: true,
};
const runDisplay: RegistryElement = {
    id: '1a1a1',
    name: 'RunDisplay',
    fiber: runDisplayFiber,
    fallbackElement: null,
    listener: () => {},
    isActive: true,
    focusable: true,
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
