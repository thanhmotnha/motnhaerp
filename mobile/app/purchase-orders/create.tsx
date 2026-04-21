import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCreatePO, useSuppliers, useProducts, useProjects } from '@/hooks/useApi';
import { COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';

interface POItem {
    productId: string;
    productName: string;
    quantity: string;
    unit: string;
    unitPrice: string;
}

export default function CreatePOScreen() {
    const { projectId, projectName } = (router as any).params || {};

    const [supplierId, setSupplierId] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
    const [selectedProjectName, setSelectedProjectName] = useState(projectName || '');
    const [note, setNote] = useState('');
    const [items, setItems] = useState<POItem[]>([
        { productId: '', productName: '', quantity: '', unit: 'cái', unitPrice: '' },
    ]);
    const [showSupplierPicker, setShowSupplierPicker] = useState(false);
    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const [showProductPicker, setShowProductPicker] = useState<number | null>(null);

    const suppliersQuery = useSuppliers();
    const productsQuery = useProducts();
    const projectsQuery = useProjects(1, '', '');
    const createMutation = useCreatePO();

    const suppliers: any[] = suppliersQuery.data?.data || suppliersQuery.data || [];
    const products: any[] = productsQuery.data?.data || productsQuery.data || [];
    const projects: any[] = projectsQuery.data?.data || [];

    function addItem() {
        setItems([...items, { productId: '', productName: '', quantity: '', unit: 'cái', unitPrice: '' }]);
    }

    function removeItem(index: number) {
        if (items.length <= 1) return;
        setItems(items.filter((_, i) => i !== index));
    }

    function updateItem(index: number, field: keyof POItem, value: string) {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
    }

    function selectSupplier(s: any) {
        setSupplierId(s.id);
        setSupplierName(s.name);
        setShowSupplierPicker(false);
    }

    function selectProject(p: any) {
        setSelectedProjectId(p.id);
        setSelectedProjectName(p.name || p.code);
        setShowProjectPicker(false);
    }

    function selectProduct(index: number, p: any) {
        const updated = [...items];
        updated[index] = {
            ...updated[index],
            productId: p.id,
            productName: p.name,
            unit: p.unit || 'cái',
            unitPrice: String(p.price || ''),
        };
        setItems(updated);
        setShowProductPicker(null);
    }

    const totalAmount = items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        return sum + qty * price;
    }, 0);

    async function handleSubmit() {
        if (!supplierName.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng chọn nhà cung cấp');
            return;
        }
        if (!selectedProjectId) {
            Alert.alert('Thiếu thông tin', 'Vui lòng chọn dự án');
            return;
        }

        const validItems = items.filter((i) => i.productName.trim() && parseFloat(i.quantity) > 0);
        if (validItems.length === 0) {
            Alert.alert('Thiếu thông tin', 'Vui lòng thêm ít nhất 1 sản phẩm');
            return;
        }

        createMutation.mutate(
            {
                supplierId: supplierId || undefined,
                supplier: supplierName,
                projectId: selectedProjectId,
                note: note.trim() || undefined,
                items: validItems.map((i) => ({
                    productName: i.productName,
                    quantity: parseFloat(i.quantity),
                    unit: i.unit,
                    unitPrice: parseFloat(i.unitPrice) || 0,
                    totalPrice: (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
                })),
            },
            {
                onSuccess: () => {
                    Alert.alert('Thành công', 'Đã tạo đơn mua hàng', [
                        { text: 'OK', onPress: () => router.back() },
                    ]);
                },
                onError: (err: any) => {
                    Alert.alert('Lỗi', err.message || 'Không thể tạo đơn mua hàng');
                },
            }
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Tạo đơn mua hàng' }} />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Supplier */}
                <Text style={styles.label}>Nhà cung cấp *</Text>
                <TouchableOpacity
                    style={styles.picker}
                    onPress={() => setShowSupplierPicker(!showSupplierPicker)}
                >
                    <Text style={supplierName ? styles.pickerText : styles.pickerPlaceholder}>
                        {supplierName || 'Chọn nhà cung cấp'}
                    </Text>
                </TouchableOpacity>
                {showSupplierPicker && (
                    <Card style={styles.dropdown}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                            {suppliers.map((s: any) => (
                                <TouchableOpacity
                                    key={s.id}
                                    style={styles.dropdownItem}
                                    onPress={() => selectSupplier(s)}
                                >
                                    <Text style={styles.dropdownText}>{s.name}</Text>
                                </TouchableOpacity>
                            ))}
                            {suppliers.length === 0 && (
                                <Text style={styles.dropdownEmpty}>Không có NCC</Text>
                            )}
                        </ScrollView>
                    </Card>
                )}

                {/* Project */}
                <Text style={styles.label}>Dự án *</Text>
                <TouchableOpacity
                    style={styles.picker}
                    onPress={() => setShowProjectPicker(!showProjectPicker)}
                >
                    <Text style={selectedProjectName ? styles.pickerText : styles.pickerPlaceholder}>
                        {selectedProjectName || 'Chọn dự án'}
                    </Text>
                </TouchableOpacity>
                {showProjectPicker && (
                    <Card style={styles.dropdown}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                            {projects.map((p: any) => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={styles.dropdownItem}
                                    onPress={() => selectProject(p)}
                                >
                                    <Text style={styles.dropdownCode}>{p.code}</Text>
                                    <Text style={styles.dropdownText}>{p.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Card>
                )}

                {/* Items */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Danh sách vật tư</Text>
                    <TouchableOpacity onPress={addItem} style={styles.addBtn}>
                        <Plus size={16} color={COLORS.white} />
                        <Text style={styles.addBtnText}>Thêm</Text>
                    </TouchableOpacity>
                </View>

                {items.map((item, index) => (
                    <Card key={index} style={styles.itemCard}>
                        <View style={styles.itemHeader}>
                            <Text style={styles.itemIndex}>#{index + 1}</Text>
                            {items.length > 1 && (
                                <TouchableOpacity onPress={() => removeItem(index)}>
                                    <Trash2 size={16} color={COLORS.danger} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Product picker */}
                        <Text style={styles.itemLabel}>Sản phẩm</Text>
                        <TouchableOpacity
                            style={styles.picker}
                            onPress={() => setShowProductPicker(showProductPicker === index ? null : index)}
                        >
                            <Text style={item.productName ? styles.pickerText : styles.pickerPlaceholder}>
                                {item.productName || 'Chọn sản phẩm'}
                            </Text>
                        </TouchableOpacity>
                        {showProductPicker === index && (
                            <Card style={styles.dropdown}>
                                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                                    {products.map((p: any) => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={styles.dropdownItem}
                                            onPress={() => selectProduct(index, p)}
                                        >
                                            <Text style={styles.dropdownText}>{p.name}</Text>
                                            <Text style={styles.dropdownSub}>{p.unit} • {formatCurrency(p.price)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </Card>
                        )}

                        <View style={styles.itemRow}>
                            <View style={{ flex: 1 }}>
                                <Input
                                    label="Số lượng"
                                    value={item.quantity}
                                    onChangeText={(v) => updateItem(index, 'quantity', v)}
                                    keyboardType="numeric"
                                    placeholder="0"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Input
                                    label="Đơn vị"
                                    value={item.unit}
                                    onChangeText={(v) => updateItem(index, 'unit', v)}
                                    placeholder="cái"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Input
                                    label="Đơn giá"
                                    value={item.unitPrice}
                                    onChangeText={(v) => updateItem(index, 'unitPrice', v)}
                                    keyboardType="numeric"
                                    placeholder="0"
                                />
                            </View>
                        </View>

                        <Text style={styles.itemTotal}>
                            Thành tiền: {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}
                        </Text>
                    </Card>
                ))}

                {/* Note */}
                <Input
                    label="Ghi chú"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                    placeholder="Ghi chú thêm..."
                    style={{ minHeight: 80, textAlignVertical: 'top' }}
                />

                {/* Total */}
                <Card style={styles.totalCard}>
                    <Text style={styles.totalLabel}>Tổng giá trị</Text>
                    <Text style={styles.totalAmount}>{formatCurrency(totalAmount)}</Text>
                </Card>

                <Button
                    title="Tạo đơn mua hàng"
                    onPress={handleSubmit}
                    loading={createMutation.isPending}
                    size="lg"
                    style={{ marginTop: 16, marginBottom: 40 }}
                />
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16, paddingBottom: 40 },
    label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 12 },
    picker: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    pickerText: { fontSize: 15, color: COLORS.text },
    pickerPlaceholder: { fontSize: 15, color: COLORS.textLight },
    dropdown: { marginTop: 4, marginBottom: 8, padding: 0 },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
    dropdownText: { fontSize: 14, color: COLORS.text },
    dropdownCode: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
    dropdownSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    dropdownEmpty: { fontSize: 14, color: COLORS.textLight, padding: 14, textAlign: 'center' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    addBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
    itemCard: { marginBottom: 12 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    itemIndex: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
    itemLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
    itemRow: { flexDirection: 'row', gap: 8 },
    itemTotal: { fontSize: 14, fontWeight: '600', color: COLORS.accent, textAlign: 'right', marginTop: 4 },
    totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    totalAmount: { fontSize: 20, fontWeight: '700', color: COLORS.accent },
});
