import '@nextui-org/listbox';
import { Ref, ReactElement } from 'react';
import { UseSelectProps } from './use-select.js';
import './hidden-select.js';
import '@react-types/shared';
import '@nextui-org/system';
import '@nextui-org/theme';
import '@nextui-org/react-utils';
import '@nextui-org/popover';
import '@nextui-org/scroll-shadow';
import '@nextui-org/use-aria-multiselect';
import '@nextui-org/spinner';
import 'react/jsx-runtime';

interface Props<T> extends UseSelectProps<T> {
}
type SelectProps<T extends object = object> = Props<T> & {
    ref?: Ref<HTMLElement>;
};
declare const _default: <T extends object>(props: SelectProps<T>) => ReactElement;

export { SelectProps, _default as default };
