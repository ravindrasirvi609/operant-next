"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CasAchievementBucket } from "@/components/cas/cas-types";

export function ManualAchievementsReadonly({
    manualAchievements,
}: {
    manualAchievements: CasAchievementBucket;
}) {
    return (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm text-foreground">
            <div>
                <p className="font-semibold text-foreground">Manually added achievements</p>
                <p className="mt-1 text-muted-foreground">
                    Additional publications, books, and projects added directly in this CAS application.
                </p>
            </div>

            <Accordion type="multiple" className="rounded-md border border-border bg-muted/50 px-3">
                <AccordionItem value="publications">
                    <AccordionTrigger>
                        Publications ({manualAchievements.publications.length})
                    </AccordionTrigger>
                    <AccordionContent>
                        {manualAchievements.publications.length ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Journal</TableHead>
                                        <TableHead>Year</TableHead>
                                        <TableHead>ISSN</TableHead>
                                        <TableHead>Indexing</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {manualAchievements.publications.map((item, index) => (
                                        <TableRow key={`${item.title}-${index}`}>
                                            <TableCell className="font-medium text-foreground">{item.title}</TableCell>
                                            <TableCell>{item.journal || "-"}</TableCell>
                                            <TableCell>{item.year}</TableCell>
                                            <TableCell>{item.issn || "-"}</TableCell>
                                            <TableCell>{item.indexing || "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-xs text-muted-foreground">No manually added publications.</p>
                        )}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="books">
                    <AccordionTrigger>
                        Books ({manualAchievements.books.length})
                    </AccordionTrigger>
                    <AccordionContent>
                        {manualAchievements.books.length ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Publisher</TableHead>
                                        <TableHead>Year</TableHead>
                                        <TableHead>ISBN</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {manualAchievements.books.map((item, index) => (
                                        <TableRow key={`${item.title}-${index}`}>
                                            <TableCell className="font-medium text-foreground">{item.title}</TableCell>
                                            <TableCell>{item.publisher || "-"}</TableCell>
                                            <TableCell>{item.year}</TableCell>
                                            <TableCell>{item.isbn || "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-xs text-muted-foreground">No manually added books.</p>
                        )}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="research-projects">
                    <AccordionTrigger>
                        Research Projects ({manualAchievements.researchProjects.length})
                    </AccordionTrigger>
                    <AccordionContent>
                        {manualAchievements.researchProjects.length ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Funding Agency</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Year</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {manualAchievements.researchProjects.map((item, index) => (
                                        <TableRow key={`${item.title}-${index}`}>
                                            <TableCell className="font-medium text-foreground">{item.title}</TableCell>
                                            <TableCell>{item.fundingAgency || "-"}</TableCell>
                                            <TableCell>{item.amount}</TableCell>
                                            <TableCell>{item.year}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-xs text-muted-foreground">No manually added research projects.</p>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div className="grid gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground sm:grid-cols-2">
                <p>PhD guided: {manualAchievements.phdGuided}</p>
                <p>Conference contributions: {manualAchievements.conferences}</p>
            </div>
        </div>
    );
}
