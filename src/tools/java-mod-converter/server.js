import fs from 'fs';
import path from 'path';
import toml from 'toml';
import { Loader, ModInfo } from './modInfo.js';

function detectModLoader(dir) {
    const files = new Set();

    function walk(currentPath) {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                walk(entryPath);
            } else {
                const relative = path.relative(dir, entryPath).replace(/\\/g, '/');
                files.add(relative.toLowerCase());
            }
        }
    }

    walk(dir);

    if (files.has('fabric.mod.json')) {
        return Loader.FABRIC;
    }
    if (files.has('mcmod.info')) {
        return Loader.OLD_FORGE;
    }
    if (Array.from(files).some(f => f.startsWith('meta-inf/mods.toml'))) {
        return Loader.NEW_FORGE;
    }
    return Loader.OTHER;
}

function detectFabricModInfo(modOutputDir, info) {
    const filePath = path.join(modOutputDir, 'fabric.mod.json');
    if (!fs.existsSync(filePath)) return;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    info.id = data.id || null;
    info.name = data.name || info.id || 'Mod sem nome';
    info.description = data.description || '';
    info.version = data.version || '?';
    info.authors = data.authors || [];
    info.license = data.license || null;
    if (data.contact?.homepage) {
        info.url = data.contact.homepage;
    }
}

function detectOldForgeModInfo(modOutputDir, info) {
    const filePath = path.join(modOutputDir, 'mcmod.info');
    if (!fs.existsSync(filePath)) return;

    const jsonText = fs.readFileSync(filePath, 'utf8');
    let data;
    try {
        data = JSON.parse(jsonText);
        if (Array.isArray(data)) data = data[0];
    } catch {
        return;
    }

    info.id = data.modid || null;
    info.name = data.name || 'Mod Forge Antigo';
    info.description = data.description || '';
    info.version = data.version || '?';
    info.authors = data.authorList || [];
    info.license = null;
    info.url = data.url || null;
}

function detectNewForgeModInfo(modOutputDir, info) {
    let modsTomlPath = null;
    function findToml(currentPath) {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                findToml(entryPath);
            } else if (entry.name === 'mods.toml') {
                modsTomlPath = entryPath;
            }
        }
    }
    findToml(modOutputDir);
    if (!modsTomlPath) return;

    const tomlText = fs.readFileSync(modsTomlPath, 'utf8');
    const parsed = toml.parse(tomlText);

    const mod = parsed.mods?.[0] || {};
    info.id = mod.modId || null;
    info.name = mod.displayName || 'Mod Forge';
    info.description = mod.description || '';
    info.version = mod.version || '?';
    info.authors = mod.authors ? mod.authors.split(',') : [];
    info.license = parsed.license || null;
    info.url = null;
}

export function convertingJavaModProcessing(modOutputDir, processId, callback) {
    //* Processo de analise */
    console.log(`Analisando mod em: ${modOutputDir}`);

    const info = new ModInfo();
    info.loader = detectModLoader(modOutputDir);

    switch (info.loader) {
        case Loader.FABRIC:
            detectFabricModInfo(modOutputDir, info);
            break;

        case Loader.OLD_FORGE:
            detectOldForgeModInfo(modOutputDir, info);
            break;

        case Loader.NEW_FORGE:
            detectNewForgeModInfo(modOutputDir, info);
            break;

        default:
            info.name = "Mod Desconhecido";
            info.description = "Não foi possível identificar o tipo do mod.";
            info.version = "?.?.?";
    }

    console.log(info.getInfoString());

    /* Processo de decompilação */
    
    callback({
        name: info.name,
        description: info.description,
        version: info.version,
        authors: info.authors,
        loader: info.loader,
    });
}