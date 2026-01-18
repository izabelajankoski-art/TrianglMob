import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import api from '../../api';
import LoaderComponent from '../Loader';

export default function PaketiScreen() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const getCourses = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/courses`);
            setCourses(res.data.filter((a) => a.description === 'default'));
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        getCourses();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        getCourses();
    };

    const formatFormat = (format) => {
        if (format === 'group') return 'Grupni čas';
        if (format === 'individual') return 'Individualni čas';
        return '';
    };

    const formatType = (type) => {
        if (type === 'regular') return 'Redovna nastava';
        if (type === 'preparatory') return 'Pripremna nastava';
        if (type === 'language') return 'Jezicki kurs';
        if (type === 'other') return 'Ostalo';
        return '';
    };

    const typeColor = (type) => {
        // blage, elegantne boje (bez preterivanja)
        if (type === 'regular') return { bg: '#EAF2FF', fg: '#1E4FA8' };
        if (type === 'preparatory') return { bg: '#FFF3E6', fg: '#B45309' };
        if (type === 'language') return { bg: '#EAFBF2', fg: '#0F766E' };
        return { bg: '#F1F5F9', fg: '#334155' };
    };

    const money = (n) => {
        const num = Number(n || 0);
        return num.toFixed(0);
    };

    return (
        <SafeAreaView style={styles.container}>
            {loading ? (
                <View style={styles.loaderWrapper}>
                    <LoaderComponent />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {/* Header */}
                    <View style={styles.pageHeader}>
                        <Text style={styles.pageTitle}>Paketi</Text>
                        <Text style={styles.pageSubtitle}>
                            Pregled dostupnih kurseva i cena. Povuci nadole za osvežavanje.
                        </Text>
                    </View>

                    {courses.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyTitle}>Nema dostupnih paketa</Text>
                            <Text style={styles.emptySubtitle}>
                                Trenutno nema kurseva za prikaz.
                            </Text>
                        </View>
                    ) : (
                        courses.map((item) => {
                            const hasDiscount = item.discount_percent !== null && item.discount_percent !== undefined;
                            const discount = hasDiscount ? Number(item.discount_percent) : 0;

                            const newPrice = hasDiscount
                                ? Math.round(Number(item.price) * ((100 - discount) / 100))
                                : null;

                            const t = typeColor(item.type);

                            return (
                                <View key={item.id} style={styles.card}>
                                    {/* Top row: name + price */}
                                    <View style={styles.topRow}>
                                        <View style={{ flex: 1, paddingRight: 10 }}>
                                            <Text style={styles.courseName} numberOfLines={2}>
                                                {item.name}
                                            </Text>

                                            <View style={styles.badgeRow}>
                                                <View style={[styles.badge, { backgroundColor: t.bg }]}>
                                                    <Text style={[styles.badgeText, { color: t.fg }]}>
                                                        {formatType(item.type)}
                                                    </Text>
                                                </View>

                                                <View style={styles.chip}>
                                                    <Text style={styles.chipText}>
                                                        {formatFormat(item.format)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.priceColumn}>
                                            {hasDiscount ? (
                                                <>
                                                    <View style={styles.discountPill}>
                                                        <Text style={styles.discountText}>-{discount}%</Text>
                                                    </View>
                                                    <Text style={styles.oldPrice}>{money(item.price)} RSD</Text>
                                                    <Text style={styles.newPrice}>{money(newPrice)} RSD</Text>
                                                </>
                                            ) : (
                                                <Text style={styles.price}>{money(item.price)} RSD</Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Divider */}
                                    <View style={styles.divider} />

                                    {/* Details */}
                                    <View style={styles.detailsRow}>
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailLabel}>Tip</Text>
                                            <Text style={styles.detailValue}>{formatType(item.type)}</Text>
                                        </View>

                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailLabel}>Format</Text>
                                            <Text style={styles.detailValue}>{formatFormat(item.format)}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 24,
    },

    loaderWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    pageHeader: {
        paddingVertical: 10,
        paddingHorizontal: 2,
        marginBottom: 10,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
    },
    pageSubtitle: {
        marginTop: 4,
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },

    emptyBox: {
        marginTop: 20,
        padding: 16,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    emptySubtitle: {
        marginTop: 6,
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },

    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E6EAF0',

        // iOS shadow
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 10,

        // Android shadow
        elevation: 2,
    },

    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },

    courseName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
    },

    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },

    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
    },

    chip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#F1F5F9',
    },
    chipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },

    priceColumn: {
        alignItems: 'flex-end',
        minWidth: 90,
    },

    discountPill: {
        backgroundColor: '#FF8C00',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        marginBottom: 6,
    },
    discountText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },

    oldPrice: {
        fontSize: 12,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    newPrice: {
        fontSize: 16,
        color: '#FF8C00',
        fontWeight: '900',
        marginTop: 2,
    },
    price: {
        fontSize: 16,
        color: '#FF8C00',
        fontWeight: '900',
        marginTop: 2,
    },

    divider: {
        height: 1,
        backgroundColor: '#E6EAF0',
        marginVertical: 12,
    },

    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },

    detailItem: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#EEF2F7',
    },

    detailLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '700',
    },
    detailValue: {
        marginTop: 4,
        fontSize: 13,
        color: '#0F172A',
        fontWeight: '800',
    },
});
