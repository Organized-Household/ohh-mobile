import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Transaction entry modal stub — STORY-4.1
 *
 * Full implementation in WP-3 ForgePacket (STORY-4.2).
 * This stub confirms the FAB opens a modal correctly.
 * Replace this file entirely in WP-3 — do not extend it.
 */
export function TransactionEntryModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.handle} />
        <Text style={styles.title}>Add Transaction</Text>
        <Text style={styles.subtitle}>
          Full transaction form coming in WP-3
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
