import { act, type PropsWithChildren, useEffect } from 'react';
import { expect, test, vi } from 'vitest';
import { renderAndAct } from '../../../testUtils/inkRenderAndAct.js';
import {
    type InputEventListener,
    InputEventProvider,
} from '../components/InputEventProvider/InputEventProvider.js';
import { Listener } from '../testUtils/Listener.js';
import {
    ListenerStackHarness,
    type StackSpies,
} from '../testUtils/ListenerStackSpy.js';
import { type FocusControls, useFocusControls } from './useFocusControls.js';

interface FocusControlsHarnessProps extends PropsWithChildren {
    controlsRef?: FocusControls;
}

function FocusControlsHarness({
    controlsRef,
    children,
}: FocusControlsHarnessProps) {
    const controls = useFocusControls();
    useEffect(() => {
        if (controlsRef) {
            controlsRef.focus = controls.focus;
            controlsRef.focusNext = controls.focusNext;
            controlsRef.focusPrev = controls.focusPrev;
        }
    });
    return <>{children}</>;
}

function createCallTracker(calls: string[], name: string) {
    return vi.fn(() => calls.push(name));
}

test('focusPrev moves the dispatch entry point down the chain, skipping more-nested listeners', async () => {
    const controls = {} as FocusControls;
    const stackSpies = {} as StackSpies;

    const { press } = await renderAndAct(
        <InputEventProvider suppressTabNavigation>
            <Listener inputOptions={{ name: 'list1' }} />
            <Listener inputOptions={{ name: 'list2' }} />
            <Listener inputOptions={{ name: 'list3' }} />
            <Listener inputOptions={{ name: 'list4' }} />
            <ListenerStackHarness stackSpies={stackSpies} />
            <FocusControlsHarness controlsRef={controls} />
        </InputEventProvider>,
    );

    await act(async () => controls.focusPrev());
    await press('x');

    expect(stackSpies.getFocusedListenersNames()).toEqual([
        'list3',
        'list2',
        'list1',
    ]);
});

test('focusPrev({ steps: 2 }) moves back two positions', async () => {
    const controls = {} as FocusControls;
    const stackSpies = {} as StackSpies;

    const { press } = await renderAndAct(
        <InputEventProvider suppressTabNavigation>
            <Listener inputOptions={{ name: 'list1' }} />
            <Listener inputOptions={{ name: 'list2' }} />
            <Listener inputOptions={{ name: 'list3' }} />
            <Listener inputOptions={{ name: 'list4' }} />
            <ListenerStackHarness stackSpies={stackSpies} />
            <FocusControlsHarness controlsRef={controls} />
        </InputEventProvider>,
    );

    await act(async () => controls.focusPrev({ steps: 2 })); // list4 -> list2
    await press('x');

    expect(stackSpies.getFocusedListenersNames()).toEqual(['list2', 'list1']);
});

test('focusNext moves the dispatch entry point back up the chain', async () => {
    const controls = {} as FocusControls;
    const stackSpies = {} as StackSpies;

    const { press } = await renderAndAct(
        <InputEventProvider suppressTabNavigation>
            <Listener inputOptions={{ name: 'list1' }} />
            <Listener inputOptions={{ name: 'list2' }} />
            <Listener inputOptions={{ name: 'list3' }} />
            <Listener inputOptions={{ name: 'list4' }} />
            <ListenerStackHarness stackSpies={stackSpies} />
            <FocusControlsHarness controlsRef={controls} />
        </InputEventProvider>,
    );

    await act(async () => controls.focusPrev()); // list4 -> list3
    await act(async () => controls.focusNext()); // list3 -> list4
    await press('x');

    expect(stackSpies.getFocusedListenersNames()).toEqual([
        'list4',
        'list3',
        'list2',
        'list1',
    ]);
});

test('focusNext wraps from the most-nested listener back to the least-nested one', async () => {
    const controls = {} as FocusControls;
    const stackSpies = {} as StackSpies;

    const { press } = await renderAndAct(
        <InputEventProvider>
            <Listener inputOptions={{ name: 'list1' }} />
            <Listener inputOptions={{ name: 'list2' }} />
            <ListenerStackHarness stackSpies={stackSpies} />
            <FocusControlsHarness controlsRef={controls} />
        </InputEventProvider>,
    );

    await act(async () => controls.focusNext()); // list2 -> list1
    await press('x');

    expect(stackSpies.getFocusedListenersNames()).toEqual(['list1']);
});

test('focusPrev wraps from the least-nested listener back to the most-nested one', async () => {
    const controls = {} as FocusControls;
    const stackSpies = {} as StackSpies;

    const { press } = await renderAndAct(
        <InputEventProvider>
            <Listener inputOptions={{ name: 'list1' }} />
            <Listener inputOptions={{ name: 'list2' }} />
            <ListenerStackHarness stackSpies={stackSpies} />
            <FocusControlsHarness controlsRef={controls} />
        </InputEventProvider>,
    );

    await act(async () => controls.focusPrev({ steps: 2 })); // list2 -> list1 -> list2
    await press('x');

    expect(stackSpies.getFocusedListenersNames()).toEqual(['list2', 'list1']);
});

test('stopPropagation still halts propagation from within a focused chain', async () => {
    const calls: string[] = [];
    const controls = {} as FocusControls;

    const stoppingListener: InputEventListener = (
        _input,
        _key,
        stopPropagation,
    ) => {
        calls.push('list2');
        stopPropagation();
    };

    const { press } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={createCallTracker(calls, 'list1')} />
            <Listener onInput={stoppingListener} />
            <Listener onInput={createCallTracker(calls, 'list3')} />
            <Listener onInput={createCallTracker(calls, 'list4')} />
            <FocusControlsHarness controlsRef={controls} />
        </InputEventProvider>,
    );

    await act(async () => controls.focusPrev()); // list4 -> list3
    await press('x');

    expect(calls).toEqual(['list3', 'list2']);
});

test('unmounting the focused listener falls back to full-chain dispatch', async () => {
    const calls: string[] = [];
    const controls = {} as FocusControls;

    const { press, rerender } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={createCallTracker(calls, 'list1')} />
            <Listener onInput={createCallTracker(calls, 'list2')} />
            <Listener onInput={createCallTracker(calls, 'list3')} />
            <Listener onInput={createCallTracker(calls, 'list4')} />
            <FocusControlsHarness controlsRef={controls} />
        </InputEventProvider>,
    );

    await act(async () => controls.focusPrev()); // list4 -> list3

    await rerender(
        <InputEventProvider>
            <Listener onInput={createCallTracker(calls, 'list1')} />
            <Listener onInput={createCallTracker(calls, 'list2')} />
            <Listener onInput={createCallTracker(calls, 'list4')} />
            <FocusControlsHarness controlsRef={controls} />
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['list4', 'list2', 'list1']);
});

test('focusNext throws for a negative steps value', async () => {
    const controls = {} as FocusControls;

    await renderAndAct(
        <InputEventProvider>
            <Listener onInput={vi.fn()} />
            <FocusControlsHarness controlsRef={controls} />
        </InputEventProvider>,
    );

    expect(() => controls.focusNext({ steps: -1 })).toThrow(
        'steps must be non-negative',
    );
});

test('focusPrev throws for a negative steps value', async () => {
    const controls = {} as FocusControls;

    await renderAndAct(
        <InputEventProvider>
            <Listener onInput={vi.fn()} />
            <FocusControlsHarness controlsRef={controls} />
        </InputEventProvider>,
    );

    expect(() => controls.focusPrev({ steps: -1 })).toThrow(
        'steps must be non-negative',
    );
});
