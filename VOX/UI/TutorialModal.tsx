import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface TutorialModalProps {
  visible: boolean;
  title: string;
  lines: string[];
  onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ visible, title, lines, onClose }) => {
  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 200 }}>
      <View style={{ width: '85%', maxHeight: '80%', backgroundColor: '#0f2a27ff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#04756cff' }}>
        <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {lines.map((line, i) => (
            <Text key={i} style={{ color: '#d5dbe7ff', fontSize: 15, lineHeight: 22, marginBottom: 10 }}>{line}</Text>
          ))}
        </ScrollView>
        <TouchableOpacity
          onPress={onClose}
          style={{ marginTop: 12, alignSelf: 'center', backgroundColor: '#04756cff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 28 }}
        >
          <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>Got it</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TutorialModal;
