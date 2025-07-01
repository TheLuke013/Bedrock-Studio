import path from 'path';

import { Loader, ModInfo } from './modInfo.js';
import { detectFabricModInfo, detectModLoader, detectNewForgeModInfo, detectOldForgeModInfo } from './detectModLoader.js';
import { ModDecompiler } from './modDecompiler.js';

export async function convertingJavaModProcessing(modOutputDir, processId, callback) {
    //* Processo de analise */
    console.log(`Analisando mod em: ${modOutputDir}`);

    const info = new ModInfo();
    info.loader = detectModLoader(modOutputDir);

    switch (info.loader) {
        case Loader.FABRIC:
            detectFabricModInfo(modOutputDir, info);
            console.log("ModLoader detectado: Fabric");
            break;

        case Loader.OLD_FORGE:
            detectOldForgeModInfo(modOutputDir, info);
            console.log("ModLoader detectado: Forge(Old)");
            break;

        case Loader.NEW_FORGE:
            detectNewForgeModInfo(modOutputDir, info);
            console.log("ModLoader detectado: Forge(New)");
            break;

        default:
            info.name = "Mod Desconhecido";
            info.description = "Não foi possível identificar o tipo do mod.";
            info.version = "?.?.?";
    }

    console.log(info.getInfoString());

    /* Processo de decompilação */
    const decompiler = new ModDecompiler(processId, path.join('..', '..', '..', 'cache'));

    const classFiles = decompiler.findClassFiles(modOutputDir);
    await decompiler.decompileClasses(classFiles, modOutputDir);

    decompiler.removeClassFiles(classFiles);

    /* Processo de analisar código descompilado */

    /* Processo de montar e empacotar como .mcaddon */
    
    callback({
        name: info.name,
        description: info.description,
        version: info.version,
        authors: info.authors,
        loader: info.loader,
    });
}