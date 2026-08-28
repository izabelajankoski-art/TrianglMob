import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import api from '../../api';
import Moment from 'moment';
import * as Animatable from 'react-native-animatable';

const ENABLE_ANIMATIONS = true;

// Expandable text component
function ExpandableText({ text, numberOfLines = 2 }) {
    const [expanded, setExpanded] = useState(false);
    const toggle = () => setExpanded(prev => !prev);

    const shouldShowButton = text && text.length > 100;

    return (
        <View>
            <Text
                style={tw`text-gray-700 text-sm leading-6`}
                numberOfLines={expanded ? undefined : numberOfLines}
            >
                {text}
            </Text>

            {shouldShowButton && (
                <TouchableOpacity onPress={toggle} style={tw`mt-1`}>
                    <Text style={tw`text-orange-500 font-medium`}>
                        {expanded ? 'Sakrij' : 'Vidi sve'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

export default function StudentHome() {
    const [infos, setInfos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchInfos = async () => {
        try {
            const res = await api.get('/infos');
            let data = res.data;

            if (
                data &&
                typeof data === 'object' &&
                Array.isArray(data.data)
            ) {
                data = data.data;
            }

            if (!Array.isArray(data)) {
                data = [];
            }

            setInfos(data);
        } catch (err) {
            console.error('Error fetching information:', err);
            setInfos([]);
        }
    };

    useEffect(() => {
        fetchInfos().finally(() => setLoading(false));
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchInfos();
        setRefreshing(false);
    };

    const renderInfo = ({ item, index }) => {
        const dateSrc = item.date || item.created_at;
        const formattedDate = dateSrc
            ? Moment(dateSrc).format('DD.MM.YYYY')
            : '';

        const content = (
            <View
                style={tw`bg-white mx-4 mb-4 rounded-2xl shadow-md overflow-hidden`}
            >
                <View style={tw`flex-row items-start`}>
                    <View style={tw`w-1 bg-orange-500`} />

                    <View style={tw`flex-1 p-4`}>
                        <View
                            style={tw`flex-row justify-between items-center mb-2`}
                        >
                            <Text
                                style={tw`text-lg font-bold text-gray-900 flex-1`}
                            >
                                {item.title}
                            </Text>

                            {formattedDate ? (
                                <View
                                    style={tw`bg-orange-100 px-2 py-1 rounded`}
                                >
                                    <Text
                                        style={tw`text-orange-700 text-xs font-medium`}
                                    >
                                        {formattedDate}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        <ExpandableText
                            text={item.text || item.body || ''}
                        />
                    </View>
                </View>
            </View>
        );

        if (!ENABLE_ANIMATIONS) {
            return content;
        }

        return (
            <Animatable.View
                animation="fadeInUp"
                duration={500}
                delay={index * 100}
                useNativeDriver
            >
                {content}
            </Animatable.View>
        );
    };

    return (
        <SafeAreaView
            style={tw`flex-1 bg-gray-100`}
            edges={['bottom']}
        >
            {/* HERO SEKCIJA */}
            <View
                style={tw`py-8 px-4 items-center rounded-b-3xl shadow-md`}
            >
                <Text style={tw`text-orange-500 text-lg font-bold`}>
                    Dobro Došli U Triangl
                </Text>

                <Text
                    style={tw`text-orange-500 text-2xl font-extrabold text-center mt-2`}
                >
                    Jedinu Školu Koja Se Voli
                </Text>
            </View>

            {/* NASLOV SEKCIJE */}
            <View style={tw`mx-4 mt-6 mb-3`}>
                <Text style={tw`text-2xl font-bold text-gray-800`}>
                    Najnovije informacije
                </Text>

                <View
                    style={tw`h-1 w-16 bg-orange-500 rounded mt-1`}
                />
            </View>

            {loading ? (
                <ActivityIndicator
                    size="large"
                    color="#FF8C00"
                    style={tw`mt-4`}
                />
            ) : (
                <FlatList
                    data={infos}
                    keyExtractor={(item, index) =>
                        item.id != null
                            ? String(item.id)
                            : String(index)
                    }
                    renderItem={renderInfo}
                    contentContainerStyle={tw`pb-8 pt-2`}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}