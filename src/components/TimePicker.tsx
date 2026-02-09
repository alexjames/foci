import React from 'react';
import { StyleSheet, Pressable, useColorScheme } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Text, View } from '@/components/Themed';
import { Colors } from '@/src/constants/Colors';
import { Layout } from '@/src/constants/Layout';

interface TimePickerProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

export function TimePicker({ hour, minute, onChange }: TimePickerProps) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      onChange(selectedDate.getHours(), selectedDate.getMinutes());
    }
  };

  return (
    <View style={styles.container}>
      <DateTimePicker
        value={date}
        mode="time"
        display="spinner"
        onChange={handleChange}
        minuteInterval={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
