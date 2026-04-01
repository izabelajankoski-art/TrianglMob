// :contentReference[oaicite:0]{index=0}
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Alert,
} from "react-native";
import tw from "twrnc";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api";
import moment from "moment";

export default function SessionListScreen({ navigation }) {
    const [allSessions, setAllSessions] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [date] = useState(() => moment().format("YYYY-MM-DD"));

    const [location, setLocation] = useState("");
    const [teacher, setTeacher] = useState(null);
    const [course, setCourse] = useState(null);

    const [uniqueLocations, setUniqueLocations] = useState([]);
    const [uniqueTeachers, setUniqueTeachers] = useState([]);
    const [uniqueCourses, setUniqueCourses] = useState([]);

    const [showLocModal, setShowLocModal] = useState(false);
    const [showTeacherModal, setShowTeacherModal] = useState(false);
    const [showCourseModal, setShowCourseModal] = useState(false);

    const sortSessions = (data) => {
        return [...data].sort((a, b) => {
            return moment(a.start_time, "H:m:i") - moment(b.start_time, "H:m:i");
        });
    };

    const getSessionStatus = (item) => {
        const now = moment();
        const start = moment(`${item.date} ${item.start_time}`, "YYYY-MM-DD H:m:i");
        const end = moment(`${item.date} ${item.end_time}`, "YYYY-MM-DD H:m:i");

        if (end.isBefore(now)) return "finished";
        if (start.isAfter(now) && start.diff(now, "minutes") <= 5) return "soon";
        if (start.isSameOrBefore(now) && end.isSameOrAfter(now)) return "active";
        return "future";
    };

    const fetchSessions = async (skipLoader = false) => {
        if (!skipLoader) setLoading(true);
        try {
            const res = await api.post("/classSessions/filter", { date });

            const items = Array.isArray(res.data.original?.data)
                ? res.data.original.data
                : Array.isArray(res.data)
                    ? res.data
                    : [];

            setAllSessions(items);
            setSessions(sortSessions(items));
        } catch {
            Alert.alert("Greška", "Ne mogu da učitam termine.");
        } finally {
            if (!skipLoader) setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchSessions(true);
        setRefreshing(false);
    };

    const handleApplyFilter = () => {
        let filtered = allSessions;

        if (location) filtered = filtered.filter((s) => s.location === location);
        if (teacher) filtered = filtered.filter((s) => s.teacher?.id === teacher.id);
        if (course) filtered = filtered.filter((s) => s.course?.id === course.id);

        setSessions(sortSessions(filtered));
    };

    const handleClearFilter = () => {
        setLocation("");
        setTeacher(null);
        setCourse(null);
        setSessions(sortSessions(allSessions));
    };

    useEffect(() => {
        setUniqueLocations(
            Array.from(new Set(allSessions.map((s) => s.location || "Nepoznata")))
                .map((loc) => ({ value: loc, label: loc }))
        );

        const teacherMap = {};
        const courseMap = {};

        allSessions.forEach((s) => {
            if (s.teacher?.id) teacherMap[s.teacher.id] = s.teacher.full_name;
            if (s.course?.id) courseMap[s.course.id] = s.course.name;
        });

        setUniqueTeachers(
            Object.entries(teacherMap).map(([id, name]) => ({
                id: Number(id),
                full_name: name,
            }))
        );

        setUniqueCourses(
            Object.entries(courseMap).map(([id, name]) => ({
                id: Number(id),
                name,
            }))
        );
    }, [allSessions]);

// :contentReference[oaicite:0]{index=0}
    const renderSession = ({ item }) => {
        const status = getSessionStatus(item);
        const isDisabled = status !== "active";

        const statusConfig = {
            active: { label: "U toku" },
            soon: { color: "bg-yellow-400", label: "Uskoro" },
            future: { color: "bg-blue-400", label: "Sledi" },
            finished: { color: "bg-gray-300", label: "Završeno" },
        };

        // 🔥 ACTIVE CARD (poseban dizajn)
        if (status === "active") {
            return (
                <TouchableOpacity
                    onPress={() =>
                        navigation.navigate("ScanStudent", { classSessionId: item.id })
                    }
                    style={tw`mb-5`}
                >
                    <LinearGradient
                        colors={["#79d59b", "#4a9e69"]}
                        style={tw`p-2 rounded-3xl shadow-lg`}
                    >
                        {/* TITLE */}
                        <View style={tw`flex-row justify-between items-center`}>
                            <Text style={tw`text-lg font-bold text-white flex-1`}>
                                {item.course?.name}
                            </Text>

                            <Text style={tw`text-white font-semibold`}>
                                {moment(item.start_time, "H:m:i").format("H:mm")}
                            </Text>
                        </View>

                        {/* INFO */}
                        <View style={tw`flex-row mt-3 flex-wrap gap-2`}>
                            <View style={tw`flex-row items-center bg-white/20 px-3 py-1 rounded-full`}>
                                <Ionicons name="location-outline" size={14} color="white" />
                                <Text style={tw`ml-1 text-xs text-white`}>
                                    {item.location}
                                </Text>
                            </View>

                            <View style={tw`flex-row items-center bg-white/20 px-3 py-1 rounded-full`}>
                                <Ionicons name="person-outline" size={14} color="white" />
                                <Text style={tw`ml-1 text-xs text-white`}>
                                    {item.teacher?.full_name}
                                </Text>
                            </View>
                        </View>

                        {/* STATUS + CTA */}
                        <View style={tw`mt-5 flex-row justify-between items-center`}>
                            <View style={tw`bg-white px-3 py-1 rounded-full`}>
                                <Text style={tw`text-green-700 text-xs font-bold`}>
                                    ● U TOKU
                                </Text>
                            </View>

                            <View style={tw`bg-black px-4 py-2 rounded-full`}>
                                <Text style={tw`text-white text-xs font-bold`}>
                                    SCAN NOW →
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            );
        }

        // 🟡 OSTALI (isti kao pre, malo clean)
        return (
            <TouchableOpacity
                disabled={isDisabled}
                onPress={() =>
                    navigation.navigate("ScanStudent", { classSessionId: item.id })
                }
                style={tw`mb-4`}
            >
                <View
                    style={tw`bg-white p-1 rounded-3xl shadow-sm ${
                        isDisabled ? "opacity-50" : ""
                    }`}
                >
                    <View style={tw`flex-row justify-between items-center`}>
                        <Text style={tw`text-base font-bold text-gray-900 flex-1`}>
                            {item.course?.name}
                        </Text>

                        <Text style={tw`text-sm text-gray-600`}>
                            {moment(item.start_time, "H:m:i").format("H:mm")}
                        </Text>
                    </View>

                    <View style={tw`flex-row mt-3 flex-wrap gap-2`}>
                        <View style={tw`flex-row items-center bg-gray-100 px-3 py-1 rounded-full`}>
                            <Ionicons name="location-outline" size={14} />
                            <Text style={tw`ml-1 text-xs`}>{item.location}</Text>
                        </View>

                        <View style={tw`flex-row items-center bg-gray-100 px-3 py-1 rounded-full`}>
                            <Ionicons name="person-outline" size={14} />
                            <Text style={tw`ml-1 text-xs`}>
                                {item.teacher?.full_name}
                            </Text>
                        </View>
                    </View>

                    <View style={tw`mt-4`}>
                        <View style={tw`px-3 py-1 rounded-full ${statusConfig[status]?.color}`}>
                            <Text style={tw`text-white text-xs font-bold`}>
                                {statusConfig[status]?.label}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && allSessions.length === 0) {
        return <ActivityIndicator style={tw`flex-1`} />;
    }

    return (
        <View style={tw`flex-1 bg-gray-100`}>
            {/* HEADER */}
            <View style={tw`px-5 pt-12 pb-6 bg-gray-50 rounded-b-3xl shadow`}>
                <Text style={tw`text-2xl font-bold text-gray-900`}>
                    Termini
                </Text>

                <Text style={tw`text-gray-500 mt-1`}>
                    {moment(date).format("DD.MM.YYYY.")}
                </Text>

                {/* FILTERS */}
                <View style={tw`flex-row flex-wrap mt-4`}>
                    {[{
                        label: course?.name || "Predmet",
                        action: () => setShowCourseModal(true),
                    },
                        {
                            label: teacher?.full_name || "Predavač",
                            action: () => setShowTeacherModal(true),
                        },
                        {
                            label: location || "Lokacija",
                            action: () => setShowLocModal(true),
                        }].map((f, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={f.action}
                            style={tw`bg-gray-200 px-4 py-2 rounded-full mr-2 mb-2`}
                        >
                            <Text style={tw`text-gray-800 text-sm`}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* BUTTONS */}
                <View style={tw`flex-row mt-3`}>
                    <TouchableOpacity
                        onPress={handleApplyFilter}
                        style={tw`flex-1 bg-black py-3 rounded-xl mr-2`}
                    >
                        <Text style={tw`text-white text-center font-bold`}>
                            Primeni
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleClearFilter}
                        style={tw`flex-1 bg-gray-200 py-3 rounded-xl`}
                    >
                        <Text style={tw`text-center font-bold`}>
                            Reset
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                contentContainerStyle={tw`p-4`}
                data={sessions}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderSession}
                refreshing={refreshing}
                onRefresh={handleRefresh}
            />

            {/* MODALS (ostavio isti UX jer je OK) */}
            <Modal visible={showCourseModal} transparent>
                <View style={tw`flex-1 justify-center bg-black/50`}>
                    <View style={tw`bg-white mx-6 p-6 rounded-2xl`}>
                        {uniqueCourses.map((c) => (
                            <TouchableOpacity key={c.id} onPress={() => {
                                setCourse(c);
                                setShowCourseModal(false);
                            }}>
                                <Text style={tw`py-3 border-b`}>{c.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            <Modal visible={showTeacherModal} transparent>
                <View style={tw`flex-1 justify-center bg-black/50`}>
                    <View style={tw`bg-white mx-6 p-6 rounded-2xl`}>
                        {uniqueTeachers.map((t) => (
                            <TouchableOpacity key={t.id} onPress={() => {
                                setTeacher(t);
                                setShowTeacherModal(false);
                            }}>
                                <Text style={tw`py-3 border-b`}>{t.full_name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            <Modal visible={showLocModal} transparent>
                <View style={tw`flex-1 justify-center bg-black/50`}>
                    <View style={tw`bg-white mx-6 p-6 rounded-2xl`}>
                        {uniqueLocations.map((l) => (
                            <TouchableOpacity key={l.value} onPress={() => {
                                setLocation(l.value);
                                setShowLocModal(false);
                            }}>
                                <Text style={tw`py-3 border-b`}>{l.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
        </View>
    );
}