-- Material de formación clínica completo sobre RCSRP (patología del manguito
-- rotador), subido por Raúl como 7 presentaciones. Se guardan como PDF
-- enlazado (no como texto): son decks de diapositivas con imágenes,
-- diagramas y tablas (una de ellas, la de tratamiento, tiene 175 páginas),
-- así que transcribirlas a texto le haría perder todo el valor visual.
--
-- Van en su propia categoría, separadas del resumen operativo que ya existe
-- ("Protocolo RCSRP (hombro)" en categoría "Protocolos clínicos"): esa
-- entrada sigue siendo la referencia rápida del día a día; esto es la
-- formación completa de fondo para quien quiera profundizar.
insert into public.sops (id, titulo, categoria, contenido, enlace, actualizado_en) values
('sop-rcsrp-1-epidemiologia', '1. Epidemiología y factores de riesgo (MR)', 'Formación clínica RCSRP (hombro)', 'Presentación completa (26 páginas) de epidemiología y factores de riesgo del manguito rotador.', '/rcsrp-1-epidemiologia-factores.pdf', '2026-07-16'),
('sop-rcsrp-2-anatomia', '2. Anatomía y biomecánica (MR)', 'Formación clínica RCSRP (hombro)', 'Presentación completa (38 páginas) de anatomía y biomecánica del manguito rotador.', '/rcsrp-2-anatomia-biomecanica.pdf', '2026-07-16'),
('sop-rcsrp-3-roturas', '3. Roturas de manguito rotador', 'Formación clínica RCSRP (hombro)', 'Presentación completa (33 páginas) sobre los tipos de roturas del manguito rotador.', '/rcsrp-3-roturas-manguito-rotador.pdf', '2026-07-16'),
('sop-rcsrp-4-por-que-duele', '4. ¿Por qué le duele a mi paciente?', 'Formación clínica RCSRP (hombro)', 'Presentación completa (19 páginas) sobre el razonamiento clínico del dolor en el paciente.', '/rcsrp-4-por-que-duele.pdf', '2026-07-16'),
('sop-rcsrp-5-valoracion-clinica', '5. Valoración clínica RCSRP', 'Formación clínica RCSRP (hombro)', 'Presentación completa (44 páginas) de valoración clínica: anamnesis, diagnóstico diferencial y algoritmo de valoración.', '/rcsrp-5-valoracion-clinica.pdf', '2026-07-16'),
('sop-rcsrp-6-valoracion-funcional', '6. Valoración funcional RCSRP', 'Formación clínica RCSRP (hombro)', 'Presentación completa (21 páginas) de valoración funcional: movilidad y fuerza.', '/rcsrp-6-valoracion-funcional.pdf', '2026-07-16'),
('sop-rcsrp-7-tratamiento', '7. Tratamiento del manguito rotador', 'Formación clínica RCSRP (hombro)', 'Presentación completa (175 páginas) de tratamiento y prescripción de ejercicio por fases.', '/rcsrp-7-tratamiento.pdf', '2026-07-16')
on conflict (id) do nothing;
