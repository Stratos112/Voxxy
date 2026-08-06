// dropdown.tsx

import React, {Dispatch, SetStateAction, useState} from 'react';
import styles from './styles';
import DropDownPicker, {ItemType} from 'react-native-dropdown-picker';

interface DropDownProps {
  placeholder: string;
  items: ItemType<string>[];
  value: string | null;
  onChangeValue: (value: string | null) => void;
  style?: object;
}

const Dropdown: React.FC<DropDownProps> = ({ placeholder, items, value, onChangeValue, style }) => {
  const [open, setOpen] = useState(false);

  const customSetValue = (callbackOrValue: ((value: string | null) => string | null) | string | null) => {
    let newValue: string | null;

    if (typeof callbackOrValue === 'function') {
      newValue = (callbackOrValue as (value: string | null) => string | null)(value);
    } else {
      newValue = callbackOrValue;
    }
    onChangeValue(newValue);
  };

  return (
    <DropDownPicker
        placeholder={placeholder}
        open={open}
        value={value}
        items={items}
        setOpen={setOpen}
        setValue={customSetValue as Dispatch<SetStateAction<string | null>>}
        style={style ? [styles.dropdown, style] : styles.dropdown}
      />
  );
};

export default Dropdown;