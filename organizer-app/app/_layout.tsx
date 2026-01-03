import "../global.css";
import { Stack } from "expo-router";

export default function RootLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: "#fff",
                },
                headerTintColor: "#000",
                headerTitleStyle: {
                    fontWeight: "bold",
                },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: "#fff" },
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: "Create Pulse",
                    headerLargeTitle: true,
                }}
            />
            <Stack.Screen
                name="pulse/[id]"
                options={{
                    title: "Pulse Details",
                    headerBackTitle: "Back",
                }}
            />
        </Stack>
    );
}
