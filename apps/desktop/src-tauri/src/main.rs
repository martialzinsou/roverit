//! Point d'entrée du binaire natif de RoverIt (desktop).
//! Délègue l'ensemble du démarrage à la bibliothèque `roverit_desktop_lib`.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    roverit_desktop_lib::run()
}