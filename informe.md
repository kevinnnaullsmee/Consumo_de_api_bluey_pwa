# Informe del Proyecto: Bluey Explorer PWA (TMDB API)

Este documento detalla el cumplimiento de los objetivos del ejercicio utilizando The Movie Database (TMDB) API, implementando además características avanzadas de Aplicación Web Progresiva (PWA).

## Configuraciones y Entorno
El proyecto está construido en HTML, CSS y JavaScript Vanilla (Modules). 
Para la **API Key**, se ha utilizado un enfoque de módulo mediante el archivo `config.js` exportando la constante `TMDB_API_KEY`. 

## PWA (Progressive Web App) y Modo Offline
La aplicación se ha transformado completamente en una PWA instalable con soporte avanzado sin conexión (Offline):
*   **Web App Manifest (`manifest.json`):** Define metadatos, iconos instalables y colores temáticos para que la app pueda ser descargada desde navegadores móviles o de escritorio interactuando como aplicación nativa.
*   **Service Worker (`service-worker.js`):** Implementa dos estrategias potentes de caché:
    *   **App Shell Caching:** Almacena los recursos estáticos (`index.html`, `styles.css`, `js/main.js`, íconos, fuentes SVG/CSS) para que toda la interfaz gráfica cargue incluso cuando no hay acceso a internet en absoluto.
    *   **Caché Dinámico (API de TMDB):** Intercepta automáticamente y sin fricciones las peticiones asíncronas hacia la API de TMDB (`api.themoviedb.org`) y sus imágenes (`image.tmdb.org`). Si la petición de internet es exitosa, se guarda dinámicamente en la caché. Esto permite a los usuarios acceder al contenido, imágenes y episodios de las series previamente visualizadas de forma perfecta incluso cuando están completamente offline (Offline First con Network Fallback).

## Endpoints Utilizados
La aplicación se ha especializado para mostrar contenido exclusivo del universo de "Bluey", haciendo uso intensivo de los siguientes endpoints en `api.js`:

1.  **`GET /search/tv`**: Se utiliza al cargar la página para buscar todas las series relacionadas de forma automática mediante concurrencia pura a la base de datos TMDB.
2.  **`GET /tv/{series_id}`**: Obtiene la información detallada y exacta de la serie una vez el usuario hace clic.
3.  **`GET /tv/{series_id}/credits`**: Se llama concurrentemente junto a los detalles para extraer a los actores principales y sus personajes dinámicos.
4.  **`GET /tv/{series_id}/recommendations`**: Llamado también concurrentemente para entregar sugerencias de series similares (filtradas explícitamente a relacionadas con "Bluey").
5.  **`GET /tv/{series_id}/season/{season_number}`**: Permite iterar y obtener la lista completa y detallada de episodios y sinopsis tabulada por temporada.

## Características Adicionales (Extras) Implementadas
*   **Instalabilidad PWA Robusta:** Descargable y ejecutable fuera del navegador como aplicación independiente con soporte multi-OS (Windows, Android, iOS).
*   **Navegación Offline sin fallos:** Gracias al Service Worker y el caché dinámico programado a mano, el usuario final jamás experimentará un error del App si el dispositivo no tiene red en un contenido que ya ha consumido.
*   **Filtros Estrictos Inteligentes "Bluey":** Se ha creado un algoritmo de filtrado robusto que analiza títulos, traducciones y descripciones para proteger el alcance de la App, asegurando que solo se muestre contenido genuino del universo de Bluey y evadiendo series erróneas ajenas.
*   **Manejo de Promesas Avanzado (`Promise.all`):** Uso de concurrencia estructurada asíncrona para cargar los Modal Content Panels mucho más rápido agrupando peticiones simultáneas sin cuello de botella (Detalles, Créditos, Recomendaciones).
*   **Modo Oscuro/Claro:** Implementado inteligentemente con variables CSS3 Root y guardado en `localStorage` del navegador para persistencia en futuras sesiones.

## Instrucciones de Ejecución
1.  Abre una terminal en el directorio raíz de `api-bluey`.
2.  Ejecuta `npm start` (o `npx serve .`).
3.  Abre la URL proporcionada (usualmente `http://localhost:3000`).
4.  Para probar el modo offline dinámico de TMDB: Navega por algunas de las series, luego desconecta tu red y vuelve a abrir cualquier serie que ya visitaste.
