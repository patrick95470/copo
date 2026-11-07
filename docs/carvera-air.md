# Makera Carvera Air

COPO propose deux post-processeurs intégrés, à sélectionner dans **Projet → Machine → Changer… → Post-processeur**, sous « Autres machines (format .pp) » :

- **Makera Carvera Air - 3 axes (mm)** : parcours XYZ non rotatifs.
- **Makera Carvera Air - 4 axes Y vers -A (mm)** : parcours enroulés X/A/Z, cylindre le long de X.

Ces profils ciblent le **firmware Makera d’origine**. Ils sont adaptés pour COPO et ne sont pas des profils certifiés par Makera. Un essai à vide sur la machine reste nécessaire avant usinage.

## Réglages

Les fichiers sont métriques (`G21`), en coordonnées absolues (`G90`), dans le repère `G54`, et utilisent des avances `G94`. Ils sortent en `.cnc`. La broche utilise `S… M3` / `M5`, les changements d’outil manuels utilisent `Tn M6`. Les parcours sont émis en segments `G1`, sans cycles de perçage ni arcs ajustés.

Régler les origines dans le contrôleur Makera. Adapter la hauteur de sécurité aux brides et au brut, en restant dans la course Z : le profil effectue un retrait à cette hauteur avant chaque déplacement rapide horizontal, puis rejoint la hauteur demandée. Il ne force ni retour machine `G28/G53`, ni retour XY ou A0 en fin de programme, ni aspiration, ni palpage.

### 4 axes

1. Déclarer l’axe rotatif **A** dans la machine.
2. Choisir le type de projet **Rotatif**, cylindre **le long de X (Y s’enroule)**.
3. Renseigner le diamètre réel du brut.
4. Choisir **Z0 sur l’axe du cylindre**. Régler également Y0 et Z0 sur l’axe physique de rotation dans le contrôleur ; régler X0 et A0 selon le dessin.
5. Vérifier à vide le sens de rotation : le développement Y positif produit A négatif, conformément au profil VCarve Makera de référence.

Exemple : pour un cylindre de diamètre 40 mm, une profondeur de 1 mm est émise à Z19 mm et un retrait de 10 mm à Z30 mm. Un développement de π × 10 mm donne A−90°.

La génération est bloquée (message et `M30`, sans mouvement) si le profil 3 axes est utilisé avec un projet rotatif, ou si le profil 4 axes est utilisé sans cylindre valide, avec un cylindre le long de Y ou avec Z0 à la surface. Les origines physiques du contrôleur ne peuvent pas être vérifiées par COPO.

Ce profil effectue un **enroulement**, pas une programmation universelle 4 axes ou une génération automatique de parcours indexés 3+1. Il transmet les avances G94 au firmware Makera ; vérifier les vitesses effectives sur les mouvements rotatifs. Il n’utilise pas d’avance inverse du temps G93. La valeur « vitesse rapide » de COPO ne remplace pas les limites G0 du contrôleur.

## Validation

Exécuter `node --test tests/carvera-air.test.cjs` pour vérifier le parseur, la bibliothèque intégrée et le générateur réels de COPO : sélection des profils, sortie multi-outils, broche, retraits, conversion angulaire, décalage Z et refus des montages incompatibles.

Ces vérifications logicielles ne remplacent pas un essai physique : contrôler la simulation, les origines, les dégagements, le sens A, les avances et le changement d’outil manuel avant toute coupe.

## Références

- [Profils Makera](https://github.com/MakeraInc/CarveraProfiles) : profil VCarve `Carvera Wrap X2A ATC (mm)` (directive `ROTARY_WRAP_Y = "-A"`) et profil Fusion `Carvera.cps` (mode Stock Air/Z1, `Tn M6`).
- [Firmware Makera, dérivé de Smoothieware](https://github.com/MakeraInc/CarveraFirmware).

## English

Select **Makera Carvera Air - 3 axes (mm)** or **Makera Carvera Air - 4 axes Y vers -A (mm)** under the built-in .pp post processors. These profiles target stock Makera firmware and require a machine dry run before cutting. For rotary wrapping, place the cylinder along X, enter its actual diameter, select Z0 at the cylinder axis, and set physical Y0/Z0 at that axis in the controller. Positive unwrapped Y maps to negative A. The controller handles G94 rotary feeds; verify actual speeds. Unsupported project setups generate a stop without motion. These profiles do not implement general simultaneous 4-axis CAM or automatic indexed 3+1 toolpaths.
