"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CasAchievementBucket } from "@/components/cas/cas-types";

export function LinkedAchievementsReadonly({
    linkedAchievements,
}: {
    linkedAchievements: CasAchievementBucket;
}) {
    return (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm text-foreground">
            <div>
                <p className="font-semibold text-foreground">Linked profile achievements (read-only)</p>
                <p className="mt-1 text-muted-foreground">
                    These records are reused from profile data and are not editable in CAS.
                </p>
            </div>

            <Accordion type="multiple" className="rounded-md border border-border bg-muted/50 px-3">
                <AccordionItem value="publications">
                    <AccordionTrigger>
                        Publications ({linkedAchievements.publications.length})
                    </AccordionTrigger>
                    <AccordionContent>
                        {linkedAchievements.publications.length ? (
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
                                    {linkedAchievements.publications.map((item, index) => (
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
                            <p className="text-xs text-muted-foreground">No linked publications available.</p>
                        )}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="books">
                    <AccordionTrigger>
                        Books ({linkedAchievements.books.length})
                    </AccordionTrigger>
                    <AccordionContent>
                        {linkedAchievements.books.length ? (
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
                                    {linkedAchievements.books.map((item, index) => (
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
                            <p className="text-xs text-muted-foreground">No linked books available.</p>
                        )}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="research-projects">
                    <AccordionTrigger>
                        Research Projects ({linkedAchievements.researchProjects.length})
                    </AccordionTrigger>
                    <AccordionContent>
                        {linkedAchievements.researchProjects.length ? (
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
                                    {linkedAchievements.researchProjects.map((item, index) => (
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
                            <p className="text-xs text-muted-foreground">No linked research projects available.</p>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Linked conference count: {linkedAchievements.conferences}
            </div>
        </div>
    );
}
