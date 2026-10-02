import 'package:flutter/material.dart';
import 'home_screen.dart';

void main() => runApp(const RumoApp());

class RumoApp extends StatelessWidget {
  const RumoApp({super.key});

  @override
  Widget build(BuildContext context) {
    ThemeData tema(Brightness b) => ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF1F7A8C),
            secondary: const Color(0xFFF4A62A),
            brightness: b,
          ),
        );
    return MaterialApp(
      title: 'Rumo',
      debugShowCheckedModeBanner: false,
      theme: tema(Brightness.light),
      darkTheme: tema(Brightness.dark),
      home: const HomeScreen(),
    );
  }
}
