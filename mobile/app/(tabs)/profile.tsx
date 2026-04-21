import React from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const c = Colors.light;

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const menuSections = [
        {
            title: 'C\u00f4ng vi\u1ec7c',
            items: [
                { icon: 'time-outline', label: 'Ch\u1ea5m c\u00f4ng', desc: 'GPS check-in/out', route: '/attendance' },
                { icon: 'calendar-outline', label: '\u0110\u01a1n ngh\u1ec9 ph\u00e9p', desc: 'G\u1eedi & theo d\u00f5i', route: '/leave-request' },
                { icon: 'construct-outline', label: 'L\u1ec7nh s\u1ea3n xu\u1ea5t', desc: 'Gia c\u00f4ng n\u1ed9i th\u1ea5t', route: '/production' },
                { icon: 'receipt-outline', label: 'Mua h\u00e0ng & nh\u1eadn PO', desc: 'Nh\u1eadn h\u00e0ng theo phi\u1ebfu PO', route: '/purchasing' },
                { icon: 'alert-circle-outline', label: 'Punch List', desc: 'QC c\u00f4ng tr\u01b0\u1eddng', route: '/punch-list' },
                { icon: 'ribbon-outline', label: 'Nghi\u1ec7m thu', desc: 'Ki\u1ec3m tra & nghi\u1ec7m thu', route: '/acceptance-check' },
                { icon: 'build-outline', label: 'B\u1ea3o h\u00e0nh', desc: 'S\u1eeda ch\u1eefa & b\u1ea3o tr\u00ec', route: '/warranty' },
                { icon: 'bar-chart-outline', label: 'B\u00e1o c\u00e1o', desc: 'Dashboard & KPI', route: '/dashboard' },
            ],
        },
        {
            title: 'T\u00e0i kho\u1ea3n',
            items: [
                { icon: 'shield-checkmark-outline', label: 'B\u1ea3o m\u1eadt', desc: '\u0110\u1ed5i m\u1eadt kh\u1ea9u', route: '' },
                { icon: 'information-circle-outline', label: 'V\u1ec1 \u1ee9ng d\u1ee5ng', desc: 'v1.0.0', route: '' },
            ],
        },
    ];

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            {/* Hero header */}
            <View style={s.header}>
                <View style={s.heroBubble1} />
                <View style={s.heroBubble2} />
                <View style={s.avatarWrap}>
                    <View style={s.avatar}>
                        <Text style={s.avatarText}>
                            {user?.name?.[0] || '?'}
                        </Text>
                    </View>
                    <View style={s.onlineDot} />
                </View>
                <Text style={s.name}>{user?.name || 'User'}</Text>
                <Text style={s.email}>{user?.email}</Text>
                <View style={s.roleBadge}>
                    <Text style={s.roleText}>{user?.role || 'Staff'}</Text>
                </View>
            </View>

            <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
                {menuSections.map((section, si) => (
                    <View key={si}>
                        <Text style={s.sectionTitle}>{section.title}</Text>
                        <View style={s.menuCard}>
                            {section.items.map((item, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        s.menuItem,
                                        i === section.items.length - 1 && { borderBottomWidth: 0 },
                                    ]}
                                    onPress={() => item.route ? router.push(item.route as any) : null}
                                    activeOpacity={0.7}>
                                    <View
                                        style={[
                                            s.menuIconBox,
                                            { backgroundColor: c.primary + '12' },
                                        ]}>
                                        <Ionicons
                                            name={item.icon as any}
                                            size={22}
                                            color={c.primary}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.menuLabel}>{item.label}</Text>
                                        <Text style={s.menuDesc}>{item.desc}</Text>
                                    </View>
                                    <View style={s.chevronCircle}>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={16}
                                            color={c.textMuted}
                                        />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Logout */}
                <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.8}>
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text style={s.logoutText}>{'\u0110\u0103ng xu\u1ea5t'}</Text>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgGradientStart },
    container: { flex: 1 },

    header: {
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 20,
        backgroundColor: c.primary,
        position: 'relative',
        overflow: 'hidden',
    },
    heroBubble1: {
        position: 'absolute', right: -30, top: -30,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(197,160,89,0.15)',
    },
    heroBubble2: {
        position: 'absolute', left: -20, bottom: -20,
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    avatarWrap: { position: 'relative', marginBottom: 12 },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: c.accent,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: { fontSize: 32, fontWeight: fontWeight.title, color: '#fff' },
    onlineDot: {
        position: 'absolute', bottom: 4, right: 4,
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: '#22c55e',
        borderWidth: 3, borderColor: c.primary,
    },
    name: { fontSize: 20, fontWeight: fontWeight.title, color: '#fff', zIndex: 1 },
    email: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2, zIndex: 1 },
    roleBadge: {
        marginTop: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: radius.pill,
        paddingHorizontal: 16,
        paddingVertical: 5,
        zIndex: 1,
    },
    roleText: { fontSize: 12, fontWeight: fontWeight.secondary, color: '#fff' },

    sectionTitle: {
        fontSize: 13, fontWeight: fontWeight.secondary,
        color: c.textMuted, textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
    },
    menuCard: {
        marginHorizontal: 16,
        backgroundColor: c.card,
        borderRadius: radius.card,
        borderWidth: 1, borderColor: c.borderP5,
        overflow: 'hidden',
        ...cardShadow,
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, gap: 14,
        borderBottomWidth: 1, borderBottomColor: c.borderP5,
    },
    menuIconBox: {
        width: 48, height: 48, borderRadius: radius.iconBox,
        alignItems: 'center', justifyContent: 'center',
    },
    menuLabel: { fontSize: 15, fontWeight: fontWeight.title, color: c.text },
    menuDesc: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
    chevronCircle: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: c.borderP5,
        alignItems: 'center', justifyContent: 'center',
    },

    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 20, marginHorizontal: 16, padding: 16,
        backgroundColor: c.card, borderRadius: radius.card,
        borderWidth: 1, borderColor: '#fecaca', gap: 8,
        ...cardShadow,
    },
    logoutText: { fontSize: 15, fontWeight: fontWeight.secondary, color: '#ef4444' },
});
